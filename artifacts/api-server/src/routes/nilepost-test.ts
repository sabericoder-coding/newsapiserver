
import { Router, type IRouter } from "express";

const router: IRouter = Router();

const NILEPOST_HOSTS = new Set(["nilepost.co.ug", "www.nilepost.co.ug"]);
const HOMEPAGE_URL = "https://nilepost.co.ug/";
const REQUEST_TIMEOUT_MS = 80000;
const MAX_HTML_BYTES = 1024 * 1024;
const MAX_ARTICLES = 8;

function safeNilepostUrl(value: string): URL | null {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      !NILEPOST_HOSTS.has(url.hostname.toLowerCase()) ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function safeImageUrl(value: string, baseUrl: string): string | null {
  try {
    const url = new URL(value, baseUrl);
    const hostname = url.hostname.toLowerCase();

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !hostname ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname === "metadata.google.internal" ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      hostname === "::1" ||
      hostname === "[::1]"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code: string) => {
      const number = Number(code);
      return Number.isInteger(number) && number >= 0 && number <= 0x10ffff
        ? String.fromCodePoint(number)
        : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => {
      const number = parseInt(code, 16);
      return Number.isInteger(number) && number >= 0 && number <= 0x10ffff
        ? String.fromCodePoint(number)
        : "";
    })
    .trim();
}

function getAttribute(tag: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(
    new RegExp(
      `\\b${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
      "i",
    ),
  );

  return match
    ? decodeHtml(match[1] ?? match[2] ?? match[3] ?? "")
    : null;
}

function getMetaContent(html: string, names: string[]): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of tags) {
    const key =
      getAttribute(tag, "property") ??
      getAttribute(tag, "name") ??
      getAttribute(tag, "itemprop");

    if (key && names.some((name) => key.toLowerCase() === name.toLowerCase())) {
      const content = getAttribute(tag, "content");
      if (content) return content;
    }
  }

  return null;
}

// Discover article links only from the homepage.
// Category pages, RSS feeds, and other pages are never crawled.
function getArticleLinks(html: string): string[] {
  const links = new Set<string>();
  const anchors = html.matchAll(/<a\b[^>]*>/gi);

  for (const match of anchors) {
    const href = getAttribute(match[0], "href");
    if (!href) continue;

    try {
      const url = safeNilepostUrl(new URL(href, HOMEPAGE_URL).toString());
      if (!url) continue;

      const pathname = url.pathname.replace(/\/+$/, "");

      // Nile Post article URL structure:
      // /category/article-id/article-slug
      if (!/^\/[^/]+\/\d+\/[^/]+$/.test(pathname)) {
        continue;
      }

      url.hash = "";
      url.search = "";
      url.pathname = `${pathname}/`;

      links.add(url.toString());

      if (links.size >= MAX_ARTICLES) {
        break;
      }
    } catch {
      // Ignore malformed links.
    }
  }

  return [...links];
}

function extractArticle(html: string, articleUrl: string) {
  const title =
    getMetaContent(html, ["og:title", "twitter:title"]) ??
    decodeHtml(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
      .replace(/<[^>]+>/g, "")
      .trim();

  if (!title) return null;

  const cleanTitle = title
    .replace(/\s*[-|]\s*Nilepost(?:\s+News)?\s*$/i, "")
    .trim();

  const publishedAt =
    getMetaContent(html, [
      "article:published_time",
      "datePublished",
      "date",
      "publish-date",
      "published_time",
      "pubdate",
    ]) ??
    html.match(/<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1] ??
    "";

  const parsedDate = Date.parse(publishedAt);

  const rawImage =
    getMetaContent(html, [
      "og:image",
      "og:image:secure_url",
      "twitter:image",
      "twitter:image:src",
    ]) ??
    html.match(/<img\b[^>]*(?:src|data-src)=["']([^"']+)["']/i)?.[1] ??
    "";

  const imageUrl = rawImage
    ? safeImageUrl(rawImage, articleUrl)
    : null;

  return {
    id: articleUrl,
    title: cleanTitle,
    publisher: "Nilepost",
    link: articleUrl,
    publishedAt: Number.isNaN(parsedDate)
      ? ""
      : new Date(parsedDate).toISOString(),
    imageUrl,
  };
}

async function fetchNilepostPage(inputUrl: string): Promise<string> {
  let currentUrl = inputUrl;

  for (let redirect = 0; redirect <= 3; redirect++) {
    if (!safeNilepostUrl(currentUrl)) {
      throw new Error("Nile Post returned a redirect outside its website.");
    }

    const response = await fetch(currentUrl, {
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; CountryPulseNilepostTest/1.0)",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");

      if (!location) {
        throw new Error("Nile Post returned an invalid redirect.");
      }

      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`Nile Post returned HTTP ${response.status}.`);
    }

    const contentType =
      response.headers.get("content-type")?.toLowerCase() ?? "";

    if (!contentType.includes("text/html")) {
      throw new Error("Nile Post did not return an HTML page.");
    }

    const contentLength = Number(
      response.headers.get("content-length") ?? "0",
    );

    if (contentLength > MAX_HTML_BYTES) {
      throw new Error("Nile Post HTML page exceeded the size limit.");
    }

    const html = await response.text();

    if (html.length > MAX_HTML_BYTES) {
      throw new Error("Nile Post HTML page exceeded the size limit.");
    }

    return html;
  }

  throw new Error("Nile Post exceeded the redirect limit.");
}

router.get("/test/nilepost-news", async (req, res): Promise<void> => {
  try {
    // Only the homepage is used to discover article links.
    const homepage = await fetchNilepostPage(HOMEPAGE_URL);
    const links = getArticleLinks(homepage);

    // Promise.allSettled preserves the original homepage link order.
    const results = await Promise.allSettled(
      links.map(async (link) => {
        const html = await fetchNilepostPage(link);
        return extractArticle(html, link);
      }),
    );

    const articles = results
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<
          NonNullable<ReturnType<typeof extractArticle>>
        > =>
          result.status === "fulfilled" &&
          result.value !== null,
      )
      .map((result) => result.value)
      .slice(0, MAX_ARTICLES);

    req.log.info(
      {
        discovered: links.length,
        extracted: articles.length,
        homepageOnlyDiscovery: true,
      },
      "Nile Post homepage news extraction completed",
    );

    res.json(articles);
  } catch (error) {
    req.log.error({ err: error }, "Nile Post news extraction failed");

    res.status(502).json({
      error: "Unable to retrieve article metadata from Nile Post.",
    });
  }
});

export default router;
