import { Router, type IRouter } from "express";
import {
  ListCountriesResponse,
  ListCountryNewsQueryParams,
  ListCountryNewsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const COUNTRIES_URL =
  "https://api.first.org/data/v1/countries?limit=1000";

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    )
    .trim();
}

function readXmlTag(block: string, tag: string): string {
  const match = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"),
  );
  return match ? decodeXml(match[1]) : "";
}

function parseNewsFeed(xml: string) {
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(
    (match) => match[1],
  );

  return blocks
    .map((block, index) => {
      const title = readXmlTag(block, "title");
      const link = readXmlTag(block, "link");
      return {
        id: `${link || title}-${index}`,
        title,
        publisher: readXmlTag(block, "source") || "Google News",
        link,
        publishedAt: readXmlTag(block, "pubDate"),
      };
    })
    .filter((item) => item.title && item.link)
    .slice(0, 18);
}

router.get("/countries", async (req, res): Promise<void> => {
  try {
    const response = await fetch(COUNTRIES_URL);
    if (!response.ok) {
      req.log.warn({ status: response.status }, "Country source returned an error");
      res.status(502).json({ error: "Country directory is unavailable." });
      return;
    }

    const payload = (await response.json()) as {
      data?: Record<string, { country?: string; region?: string }>;
    };

    const countries = Object.entries(payload.data ?? {})
      .filter(([, country]) => country.country)
      .map(([code, country]) => ({
        code,
        name: country.country ?? "",
        officialName: country.country ?? "",
        region: country.region ?? "World",
        subregion: "",
        flagUrl: `https://flagcdn.com/w80/${code.toLowerCase()}.png`,
        population: 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(ListCountriesResponse.parse(countries));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load country directory");
    res.status(502).json({ error: "Country directory is unavailable." });
  }
});

router.get("/news", async (req, res): Promise<void> => {
  const parsed = ListCountryNewsQueryParams.safeParse({
    country: req.query.country,
  });

  if (!parsed.success) {
    res.status(400).json({ error: "A country name is required." });
    return;
  }

  try {
    const query = encodeURIComponent(`"${parsed.data.country}"`);
    const newsUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
    const response = await fetch(newsUrl, {
      headers: { Accept: "application/rss+xml, application/xml" },
    });

    if (!response.ok) {
      req.log.warn({ status: response.status }, "News source returned an error");
      res.status(502).json({ error: "Headlines are unavailable right now." });
      return;
    }

    const items = parseNewsFeed(await response.text());
    if (!items.length) {
      res.status(502).json({
        error: `No fresh headlines found for ${parsed.data.country}.`,
      });
      return;
    }

    res.json(ListCountryNewsResponse.parse(items));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load country news");
    res.status(502).json({ error: "Headlines are unavailable right now." });
  }
});

export default router;