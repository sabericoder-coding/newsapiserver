
import { Router, type IRouter } from "express";
import {
  ListCountriesResponse,
  ListCountryNewsQueryParams,
  ListCountryNewsResponse,
} from "@workspace/api-zod";

import { getCountryNews } from "../lib/news-provider";

const router: IRouter = Router();

const COUNTRIES_URL =
  "https://api.first.org/data/v1/countries?limit=1000";

router.get("/countries", async (req, res): Promise<void> => {
  try {
    const response = await fetch(COUNTRIES_URL);

    if (!response.ok) {
      req.log.warn(
        { status: response.status },
        "Country source returned an error",
      );

      res.status(502).json({
        error: "Country directory is unavailable.",
      });
      return;
    }

    const payload = (await response.json()) as {
      data?: Record<
        string,
        {
          country?: string;
          region?: string;
        }
      >;
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
    req.log.error(
      { err: error },
      "Failed to load country directory",
    );

    res.status(502).json({
      error: "Country directory is unavailable.",
    });
  }
});

router.get("/news", async (req, res): Promise<void> => {
  const parsed = ListCountryNewsQueryParams.safeParse({
    country: req.query.country,
  });

  if (!parsed.success) {
    res.status(400).json({
      error: "A country name is required.",
    });
    return;
  }

  try {
    // Google News and publisher RSS feeds provide the headlines.
    // Currents is added when CURRENTS_API_KEY is configured.
    // Results are cached for 30 minutes by getCountryNews().
    const items = await getCountryNews(parsed.data.country);

    if (!items.length) {
      res.status(502).json({
        error: `No fresh headlines found for ${parsed.data.country}.`,
      });
      return;
    }

    // Preserve the existing API response schema for Android.
    const validatedItems = ListCountryNewsResponse.parse(items);

    res.json(validatedItems);
  } catch (error) {
    req.log.error(
      {
        err: error,
        country: parsed.data.country,
      },
      "Failed to load country news",
    );

    res.status(502).json({
      error: "Headlines are unavailable right now.",
    });
  }
});

export default router;
