
import { Router, type IRouter } from "express";

const router: IRouter = Router();

const OBSERVER_HOSTS = new Set(["observer.ug", "www.observer.ug"]);
const HOMEPAGE_URL = "https://observer.ug/";
const REQUEST_TIMEOUT_MS = 80000;
const MAX_HTML_BYTES = 1024 * 1024;
const MAX_DISCOVERED_LINKS = 24;
const MAX_ARTICLES = 8;

function safeObserverUrl(value: string): URL | null {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      !OBSERVER_HOSTS.has(url.hostname.toLowerCase()) ||
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

function getArticleLinks(html: string): string[] {
  const links = new Set<string>();
  const anchors = html.matchAll(/<a\b[^>]*>/gi);

  for (const match of anchors) {
    const href = getAttribute(match[0], "href");
    if (!href) continue;

    try {
      const url = safeObserverUrl(new URL(href, HOMEPAGE_URL).toString());
      if (!url) continue;

      const segments = url.pathname.split("/").filter(Boolean);

      if (
        segments.length < 2 ||
        /^(category|tag|author|page|search|wp-content|wp-json|feed)$/i.test(
          segments[0],
        ) ||
        /\.(jpg|jpeg|png|gif|webp|svg|pdf|xml)$/i.test(url.pathname)
      ) {
        continue;
      }

      url.hash = "";
      url.search = "";
      url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;

      links.add(url.toString());
    } catch {
      // Ignore malformed links and continue discovering other articles.
    }
  }

  return [...links].slice(0, MAX_DISCOVERED_LINKS);
}

function extractArticle(html: string, articleUrl: string) {
  const title =
    getMetaContent(html, ["og:title", "twitter:title"]) ??
    decodeHtml(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
      .replace(/<[^>]+>/g, "")
      .trim();

  if (!title) return null;
const cleanTitle = title.replace(/\s+-\s+The Observer Media Ltd$/i, "").trim();

  const description =
    getMetaContent(html, [
      "og:description",
      "twitter:description",
      "description",
    ]) ?? "";

  const keywords = getMetaContent(html, ["keywords"]) ?? "";

  // Read the page text only to determine country relevance.
  // Article body text is never included in the API response.
  const pageText = decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );

  const relevanceText = `${title} ${description} ${keywords} ${pageText}`;

  if (!/\buganda\b/i.test(relevanceText)) {
    return null;
  }

  const publishedAt =
    getMetaContent(html, [
      "article:published_time",
      "datePublished",
      "date",
      "publish-date",
    ]) ??
    html.match(/<time\b[^>]*datetime=["']([^"']+)["']/i)?.[1] ??
    "";

  const parsedDate = Date.parse(publishedAt);

  const rawImage = getMetaContent(html, [
    "og:image",
    "og:image:secure_url",
    "twitter:image",
  ]);

  const imageUrl = rawImage
    ? safeImageUrl(rawImage, articleUrl)
    : null;

  return {
    id: articleUrl,
    title: cleanTitle,
    publisher: "The Observer Media Ltd",
    link: articleUrl,
    publishedAt: Number.isNaN(parsedDate)
      ? ""
      : new Date(parsedDate).toISOString(),
    imageUrl,
  };
}

async function fetchObserverPage(inputUrl: string): Promise<string> {
  let currentUrl = inputUrl;

  for (let redirect = 0; redirect <= 3; redirect++) {
    if (!safeObserverUrl(currentUrl)) {
      throw new Error("Observer returned a redirect outside its own website.");
    }

    const response = await fetch(currentUrl, {
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; CountryPulseObserverTest/1.0)",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Observer returned an invalid redirect.");
      }

      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`Observer returned HTTP ${response.status}.`);
    }

    const contentType =
      response.headers.get("content-type")?.toLowerCase() ?? "";

    if (!contentType.includes("text/html")) {
      throw new Error("Observer did not return an HTML page.");
    }

    const contentLength = Number(
      response.headers.get("content-length") ?? "0",
    );

    if (contentLength > MAX_HTML_BYTES) {
      throw new Error("Observer HTML page exceeded the size limit.");
    }

    const html = await response.text();

    if (html.length > MAX_HTML_BYTES) {
      throw new Error("Observer HTML page exceeded the size limit.");
    }

    return html;
  }

  throw new Error("Observer exceeded the redirect limit.");
}

router.get("/test/observer-news", async (req, res): Promise<void> => {
  try {
    const homepage = await fetchObserverPage(HOMEPAGE_URL);
    const links = getArticleLinks(homepage);

    const results = await Promise.allSettled(
      links.map(async (link) => {
        const html = await fetchObserverPage(link);
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
        filteredFor: "Uganda",
      },
      "Observer Uganda metadata test completed",
    );

    res.json(articles);
  } catch (error) {
    req.log.error({ err: error }, "Observer metadata test failed");

    res.status(502).json({
      error: "Unable to retrieve article metadata from The Observer.",
    });
  }
});

export default router;
