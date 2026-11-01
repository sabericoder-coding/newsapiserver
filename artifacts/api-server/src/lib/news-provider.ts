
import { XMLParser } from "fast-xml-parser";
import { isIP } from "node:net";

export type CountryNewsItem = {
  id: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  imageUrl?: string | null;
};

type NewsCacheEntry = {
  items: CountryNewsItem[];
  cachedAt: number;
};

type RssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string | { "#text"?: string };
  "media:content"?: unknown;
  "media:thumbnail"?: unknown;
  enclosure?: unknown;
  "content:encoded"?: string;
};

type RssPayload = {
  rss?: {
    channel?: {
      item?: RssItem | RssItem[];
    };
  };
};

type CurrentsArticle = {
  id?: string | null;
  title?: string | null;
  url?: string | null;
  published?: string | null;
  author?: string | null;
  domain?: string | null;
  image?: string | null;
};

type CurrentsResponse = {
  status?: string;
  news?: CurrentsArticle[];
};

const DEFAULT_CACHE_TTL_MS = 20 * 60 * 1000;
const DEFAULT_MAX_RESULTS = 18;
const REQUEST_TIMEOUT_MS = 8_000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  processEntities: true,
});

const cache = new Map<string, NewsCacheEntry>();
const pendingRequests = new Map<string, Promise<CountryNewsItem[]>>();

const PUBLISHER_FEEDS = [
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
  },
  {
    name: "Deutsche Welle",
    url: "https://rss.dw.com/xml/rss-en-all",
  },
  {
    name: "France 24",
    url: "https://www.france24.com/en/rss",
  },
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
  },
  {
    name: "The Guardian",
    url: "https://www.theguardian.com/world/rss",
  },
];

function getPositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : fallback;
}

function getCacheTtl(): number {
  return getPositiveInteger(
    process.env.NEWS_CACHE_TTL_MS,
    DEFAULT_CACHE_TTL_MS,
  );
}

function getMaxResults(): number {
  return Math.min(
    getPositiveInteger(
      process.env.NEWS_MAX_RESULTS,
      DEFAULT_MAX_RESULTS,
    ),
    20,
  );
}

function normalizeCountry(country: string): string {
  return country.trim().replace(/\s+/g, " ");
}

function cacheKey(country: string): string {
  return normalizeCountry(country).toLocaleLowerCase();
}

function normalizePublishedDate(
  value: string | null | undefined,
): string {
  if (!value) return "";

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp)
    ? ""
    : new Date(timestamp).toISOString();
}

function publisherFromUrl(
  url: string | null | undefined,
): string {
  if (url) {
    try {
      return new URL(url).hostname.replace(/^www\./i, "");
    } catch {
      // Ignore malformed URLs.
    }
  }

  return "Unknown source";
}

function sourceName(
  source: RssItem["source"],
): string | undefined {
  if (typeof source === "string") {
    return source.trim() || undefined;
  }

  if (source && typeof source === "object") {
    return source["#text"]?.trim() || undefined;
  }

  return undefined;
}

function normalizeImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  let candidate = value.trim();

  if (candidate.startsWith("//")) {
    candidate = `https:${candidate}`;
  }

  try {
    const parsed = new URL(candidate);

    if (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
    ) {
      return parsed.toString();
    }
  } catch {
    // Ignore invalid image URLs.
  }

  return undefined;
}

function imageUrlFromRssValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const result = imageUrlFromRssValue(entry);
      if (result) return result;
    }

    return undefined;
  }

  if (typeof value === "string") {
    return normalizeImageUrl(value);
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  const directUrl =
    normalizeImageUrl(record["@_url"]) ||
    normalizeImageUrl(record.url) ||
    normalizeImageUrl(record["@_href"]);

  if (directUrl) return directUrl;

  for (const nestedValue of Object.values(record)) {
    const result = imageUrlFromRssValue(nestedValue);
    if (result) return result;
  }

  return undefined;
}

function extractRssImageUrl(item: RssItem): string | undefined {
  const feedImage =
    imageUrlFromRssValue(item["media:thumbnail"]) ||
    imageUrlFromRssValue(item["media:content"]) ||
    imageUrlFromRssValue(item.enclosure);

  if (feedImage) return feedImage;

  const description =
    item["content:encoded"] ||
    item.description ||
    "";

  const imageMatch = description.match(
    /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i,
  );

  if (imageMatch?.[1]) {
    return normalizeImageUrl(imageMatch[1]);
  }

  return undefined;
}



const IMAGE_REQUEST_TIMEOUT_MS = 4_000;
const MAX_IMAGE_LOOKUPS = 6;
const MAX_IMAGE_HTML_BYTES = 1024 * 1024;
const IMAGE_CACHE_TTL_MS = 60 * 60 * 1000;

type ImageCacheEntry = {
  imageUrl: string | null;
  cachedAt: number;
};

const imageCache = new Map<string, ImageCacheEntry>();

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return false;
    }

    if (url.username || url.password) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    if (
      !hostname ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname === "metadata.google.internal"
    ) {
      return false;
    }

    const ipVersion = isIP(hostname);

    if (ipVersion === 4 && isPrivateIpv4(hostname)) {
      return false;
    }

    // Reject IPv6 literals to avoid accidentally accessing
    // local, loopback, or link-local IPv6 destinations.
    if (ipVersion === 6) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function extractPublisherImage(
  html: string,
  pageUrl: string,
): string | null {
  const patterns = [
    /<meta\b(?=[^>]*\bproperty\s*=\s*["']og:image(?::secure_url)?["'])(?=[^>]*\bcontent\s*=\s*["']([^"']+)["'])[^>]*>/i,
    /<meta\b(?=[^>]*\bname\s*=\s*["']twitter:image(?::src)?["'])(?=[^>]*\bcontent\s*=\s*["']([^"']+)["'])[^>]*>/i,
    /<meta\b(?=[^>]*\bproperty\s*=\s*["']og:image(?::secure_url)?["'])(?=[^>]*\bcontent\s*=\s*([^>\s]+))[^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const rawImageUrl = match?.[1]?.replace(/^["']|["']$/g, "");

    if (!rawImageUrl) continue;

    try {
      const imageUrl = new URL(rawImageUrl, pageUrl).toString();

      if (isSafeExternalUrl(imageUrl)) {
        return imageUrl;
      }
    } catch {
      // Try the next metadata pattern.
    }
  }

  // Also support metadata where content appears before property/name.
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const property =
      tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];

    if (
      !property ||
      !/^(og:image(?::secure_url)?|twitter:image(?::src)?)$/i.test(property)
    ) {
      continue;
    }

    const content =
      tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];

    if (!content) continue;

    try {
      const imageUrl = new URL(content, pageUrl).toString();

      if (isSafeExternalUrl(imageUrl)) {
        return imageUrl;
      }
    } catch {
      // Ignore malformed image metadata.
    }
  }

  return null;
}

async function fetchPublisherImage(
  articleUrl: string,
): Promise<string | null> {
  if (!isSafeExternalUrl(articleUrl)) {
    return null;
  }




  

  // Google News article pages expose a generic image rather than
  // the publisher's actual story image. Never use that thumbnail.
  const articleHostname = new URL(articleUrl).hostname.toLowerCase();

  if (
    articleHostname === "news.google.com" ||
    articleHostname.endsWith(".news.google.com")
  ) {
    imageCache.set(articleUrl, {
      imageUrl: null,
      cachedAt: Date.now(),
    });

    return null;
  }

  const cached = imageCache.get(articleUrl);

  if (
    cached &&
    Date.now() - cached.cachedAt < IMAGE_CACHE_TTL_MS
  ) {
    return cached.imageUrl;
  }

  let currentUrl = articleUrl;

  try {
    for (let redirect = 0; redirect <= 5; redirect++) {
      if (!isSafeExternalUrl(currentUrl)) {
        return null;
      }

      const response = await fetch(currentUrl, {
        redirect: "manual",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent":
            "Mozilla/5.0 (compatible; CountryPulse/1.0)",
        },
        signal: AbortSignal.timeout(IMAGE_REQUEST_TIMEOUT_MS),
      });

      if (
        response.status >= 300 &&
        response.status < 400
      ) {
        const location = response.headers.get("location");

        if (!location) return null;

        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) return null;

      const contentType =
        response.headers.get("content-type")?.toLowerCase() ?? "";

      if (!contentType.includes("text/html")) {
        return null;
      }

      const contentLength = Number(
        response.headers.get("content-length") ?? "0",
      );

      if (
        Number.isFinite(contentLength) &&
        contentLength > MAX_IMAGE_HTML_BYTES
      ) {
        return null;
      }

      const html = await response.text();

      if (html.length > MAX_IMAGE_HTML_BYTES) {
        return null;
      }

      const imageUrl = extractPublisherImage(html, currentUrl);

      imageCache.set(articleUrl, {
        imageUrl,
        cachedAt: Date.now(),
      });

      return imageUrl;
    }
  } catch {
    // Image retrieval must never break the news response.
  }

  imageCache.set(articleUrl, {
    imageUrl: null,
    cachedAt: Date.now(),
  });

  return null;
}

async function enrichMissingImages(
  items: CountryNewsItem[],
): Promise<CountryNewsItem[]> {
  const result = [...items];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++;

      if (index >= result.length) {
        return;
      }

      const article = result[index];

      // Preserve images already supplied by RSS or Currents.
      if (article.imageUrl) {
        continue;
      }

      result[index] = {
        ...article,
        imageUrl: await fetchPublisherImage(article.link),
      };
    }
  }

  const workerCount = Math.min(
    MAX_IMAGE_LOOKUPS,
    result.length,
  );

  await Promise.all(
    Array.from({ length: workerCount }, () => worker()),
  );

  return result;
}



function extractRssItems(xml: string): RssItem[] {
  const payload = parser.parse(xml) as RssPayload;
  const items = payload.rss?.channel?.item;

  if (!items) return [];

  return Array.isArray(items) ? items : [items];
}

function countryMatches(
  text: string,
  country: string,
): boolean {
  return text
    .toLocaleLowerCase()
    .includes(country.toLocaleLowerCase());
}

function toNewsItem(
  item: RssItem,
  fallbackPublisher: string,
): CountryNewsItem | null {
  const title = item.title?.trim() || "";
  const link = item.link?.trim() || "";

  if (!title || !link) return null;

  try {
    const parsedUrl = new URL(link);

    if (
      parsedUrl.protocol !== "https:" &&
      parsedUrl.protocol !== "http:"
    ) {
      return null;
    }
  } catch {
    return null;
  }

  const publisher =
    sourceName(item.source) ||
    publisherFromUrl(link) ||
    fallbackPublisher;

  return {
    id: link,
    title,
    publisher,
    link,
    publishedAt: normalizePublishedDate(item.pubDate),
    imageUrl: extractRssImageUrl(item) ?? null,
  };
}

/**
 * Creates a normalized title for duplicate detection.
 *
 * Removes punctuation, spaces, and common publisher suffixes
 * so the same story can be recognized across different feeds.
 */
function normalizeTitle(title: string): string {
  return title
    .toLocaleLowerCase()
    .replace(/\s+-\s+[^-]+$/, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Removes duplicate articles using both URL and normalized title.
 * Newest articles are kept first.
 */
/**
 * Removes duplicate articles using both URL and normalized title.
 * When duplicates exist, the newest version is kept.
 *
 * Does not limit the number of results here because all
 * collected stories must be available for ranking first.
 */
function deduplicate(
  items: CountryNewsItem[],
): CountryNewsItem[] {
  const seenLinks = new Set<string>();
  const titleIndexes = new Map<string, number>();
  const result: CountryNewsItem[] = [];

  const sorted = [...items].sort((a, b) => {
    const dateA = Date.parse(a.publishedAt) || 0;
    const dateB = Date.parse(b.publishedAt) || 0;

    return dateB - dateA;
  });

  for (const item of sorted) {
    const linkKey = item.link.trim().toLocaleLowerCase();
    const titleKey = normalizeTitle(item.title);

    if (
      !item.title.trim() ||
      !linkKey ||
      !titleKey ||
      seenLinks.has(linkKey)
    ) {
      continue;
    }

    seenLinks.add(linkKey);

    const existingIndex = titleIndexes.get(titleKey);

    if (existingIndex === undefined) {
      titleIndexes.set(titleKey, result.length);
      result.push(item);
      continue;
    }

    const existing = result[existingIndex];

    const isGoogleNewsLink = (link: string): boolean => {
      try {
        const hostname = new URL(link).hostname.toLowerCase();

        return (
          hostname === "news.google.com" ||
          hostname.endsWith(".news.google.com")
        );
      } catch {
        return false;
      }
    };

    const existingIsGoogle = isGoogleNewsLink(existing.link);
    const incomingIsGoogle = isGoogleNewsLink(item.link);

    // Prefer a real publisher article URL over a Google News URL.
    const preferred =
      existingIsGoogle && !incomingIsGoogle
        ? item
        : existing;

    // Prefer an image supplied by a publisher RSS record.
    const imageUrl =
      !incomingIsGoogle && item.imageUrl
        ? item.imageUrl
        : existing.imageUrl || item.imageUrl || null;

    result[existingIndex] = {
      ...existing,
      id: preferred.link,
      link: preferred.link,
      publisher: preferred.publisher,
      imageUrl,
    };
  }

  return result;
}
/**
 * Gives priority to articles whose headlines explicitly mention
 * the selected country.
 */
function getCountryRelevanceScore(
  item: CountryNewsItem,
  country: string,
): number {
  const title = item.title.trim().toLocaleLowerCase();
  const normalizedCountry = country.trim().toLocaleLowerCase();

  if (!title || !normalizedCountry) return 0;

  if (title.startsWith(normalizedCountry)) return 2;

  if (countryMatches(title, normalizedCountry)) return 1;

  return 0;
}

/**
 * Ranks articles by:
 * 1. Country relevance.
 * 2. Publication recency.
 * 3. Image availability when articles are published
 *    within the same two-hour window.
 *
 * Newer articles are never displaced by substantially older
 * articles simply because they have an image.
 */
function rankNewsItems(
  items: CountryNewsItem[],
  country: string,
): CountryNewsItem[] {
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

  const relevanceGroups = new Map<number, CountryNewsItem[]>();

  for (const item of items) {
    const score = getCountryRelevanceScore(item, country);
    const group = relevanceGroups.get(score) ?? [];

    group.push(item);
    relevanceGroups.set(score, group);
  }

  const ranked: CountryNewsItem[] = [];

  // Process the most relevant headlines first.
  const scores = [...relevanceGroups.keys()].sort((a, b) => b - a);

  for (const score of scores) {
    const group = relevanceGroups.get(score) ?? [];

    const sortedByDate = [...group].sort((a, b) => {
      const dateA = Date.parse(a.publishedAt) || 0;
      const dateB = Date.parse(b.publishedAt) || 0;

      return dateB - dateA;
    });

    let index = 0;

    while (index < sortedByDate.length) {
      const first = sortedByDate[index];
      const firstDate = Date.parse(first.publishedAt) || 0;

      // Keep articles within two hours of the newest article
      // in this window together.
      const window: CountryNewsItem[] = [];

      while (index < sortedByDate.length) {
        const candidate = sortedByDate[index];
        const candidateDate = Date.parse(candidate.publishedAt) || 0;

        if (
          firstDate > 0 &&
          candidateDate > 0 &&
          firstDate - candidateDate > TWO_HOURS_MS
        ) {
          break;
        }

        window.push(candidate);
        index++;
      }

      // Images are a secondary preference within the same
      // recency window, not a replacement for recency.
      window.sort((a, b) => {
        const imageA = Boolean(a.imageUrl);
        const imageB = Boolean(b.imageUrl);

        if (imageA !== imageB) {
          return imageB ? 1 : -1;
        }

        const dateA = Date.parse(a.publishedAt) || 0;
        const dateB = Date.parse(b.publishedAt) || 0;

        return dateB - dateA;
      });

      ranked.push(...window);
    }
  }

  return ranked;
}



async function fetchRssFeed(
  feedUrl: string,
  publisher: string,
  country?: string,
): Promise<CountryNewsItem[]> {
  const response = await fetch(feedUrl, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "CountryPulse/1.0 RSS Reader",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `${publisher} returned HTTP ${response.status}.`,
    );
  }

  const xml = await response.text();

  if (!xml.trim()) {
    throw new Error(
      `${publisher} returned an empty RSS feed.`,
    );
  }

  const items = extractRssItems(xml);

  return items
    .map((item) => toNewsItem(item, publisher))
    .filter(
      (item): item is NonNullable<typeof item> => item !== null,
    )
    .filter((item) => {
      if (!country) return true;

      // Publisher feeds are global feeds. Keep stories whose
      // headlines mention the selected country.
      return countryMatches(item.title, country);
    });
}

async function fetchGoogleNews(
  country: string,
): Promise<CountryNewsItem[]> {
  const url = new URL(
    "https://news.google.com/rss/search",
  );

  url.searchParams.set("q", country);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");

  return fetchRssFeed(url.toString(), "Google News");
}

async function fetchCurrents(
  country: string,
): Promise<CountryNewsItem[]> {
  const apiKey = process.env.CURRENTS_API_KEY?.trim();

  if (!apiKey) return [];

  const url = new URL(
    "https://api.currentsapi.services/v1/search",
  );

  url.searchParams.set("keywords", country);
  url.searchParams.set("language", "en");
  url.searchParams.set("page_number", "1");
  url.searchParams.set(
    "page_size",
    String(getMaxResults()),
  );

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `Currents returned HTTP ${response.status}.`,
    );
  }

  const payload =
    (await response.json()) as CurrentsResponse;

  if (!Array.isArray(payload.news)) {
    throw new Error(
      "Currents returned an invalid response.",
    );
  }

  return payload.news
    .map((article, index) => {
      const link = article.url?.trim() || "";
      const title = article.title?.trim() || "";

      if (!link || !title) return null;

      try {
        const parsedUrl = new URL(link);

        if (
          parsedUrl.protocol !== "https:" &&
          parsedUrl.protocol !== "http:"
        ) {
          return null;
        }
      } catch {
        return null;
      }

      return {
        id: article.id?.trim() || link || `currents-${index}`,
        title,
        publisher:
          article.domain?.trim() ||
          article.author?.trim() ||
          publisherFromUrl(link),
        link,
        publishedAt: normalizePublishedDate(
          article.published,
        ),
        imageUrl: normalizeImageUrl(article.image) ?? null,
      };
    })
    .filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );
}

async function refreshNews(
  country: string,
): Promise<CountryNewsItem[]> {
  const tasks: Promise<CountryNewsItem[]>[] = [
    fetchGoogleNews(country),

    ...PUBLISHER_FEEDS.map((feed) =>
      fetchRssFeed(feed.url, feed.name, country),
    ),
  ];

  // Currents is optional and requires an API key.
  if (process.env.CURRENTS_API_KEY?.trim()) {
    tasks.push(fetchCurrents(country));
  }

  const results = await Promise.allSettled(tasks);

  const collected: CountryNewsItem[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      collected.push(...result.value);
    }
  }

  // Step 1: Remove duplicate stories.
  const uniqueItems = deduplicate(collected);

  // Step 2: Prioritize country relevance and recency.
  const rankedItems = rankNewsItems(uniqueItems, country);

  // Step 3: Enforce the configured maximum.
  const selectedItems = rankedItems.slice(0, getMaxResults());

  // Step 4: Retrieve missing article images.
  const items = await enrichMissingImages(selectedItems);

  if (items.length === 0) {
    const failures = results
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      )
      .map((result) => String(result.reason));

    throw new Error(
      `No news found for "${country}". Feed failures: ${failures.join("; ")}`,
    );
  }

  return items;
}

/**
 * Retrieves country news from Google News and multiple
 * international publisher RSS feeds.
 *
 * Results are cached for 20 minutes by default.
 * Set NEWS_CACHE_TTL_MS to change the cache duration.
 * Set NEWS_MAX_RESULTS to change the maximum number of articles.
 *
 * A configured Currents API key adds Currents as another source.
 * Individual feed failures do not prevent successful feeds
 * from being used.
 */
export async function getCountryNews(
  requestedCountry: string,
): Promise<CountryNewsItem[]> {
  const country = normalizeCountry(requestedCountry);

  if (!country) return [];

  const key = cacheKey(country);
  const cached = cache.get(key);

  const cacheIsFresh =
    cached !== undefined &&
    Date.now() - cached.cachedAt < getCacheTtl();

  if (cacheIsFresh) {
    return cached.items;
  }

  const pending = pendingRequests.get(key);

  if (pending) {
    return pending;
  }

  const refreshPromise = (async () => {
    try {
      const items = await refreshNews(country);

      cache.set(key, {
        items,
        cachedAt: Date.now(),
      });

      return items;
    } catch (error) {
      // Keep previously successful results available during
      // temporary feed or network outages.
      if (cached?.items.length) {
        return cached.items;
      }

      throw error;
    } finally {
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, refreshPromise);

  return refreshPromise;
}




