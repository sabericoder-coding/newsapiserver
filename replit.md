# Country Pulse

Country Pulse is an Android-first country explorer that pairs a complete country directory with current news briefings for each country.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/country-pulse/` — Expo mobile app and its visual theme.
- `artifacts/country-pulse/app/index.tsx` — country picker, search, news briefing, refresh, and article-opening flows.
- `artifacts/country-pulse/constants/colors.ts` — Country Pulse light and dark semantic color tokens.
- `artifacts/api-server/src/routes/world.ts` — server-side proxy for the public country directory and Google News RSS.
- `lib/api-spec/openapi.yaml` — source of truth for the world data endpoints.

## Architecture decisions

- The mobile client uses the generated API client and React Query for country and news data.
- Public upstream data is proxied through the Express API so Android and browser previews avoid cross-origin restrictions.
- The selected country is persisted locally with AsyncStorage so the last briefing returns on the next launch.
- Google News RSS is used for headlines so the first build works without a user-supplied news API key.

## Product

- Browse all 249 countries in a horizontally scrollable picker.
- Search the directory by country name.
- Tap a country to load a current related-news briefing.
- Pull to refresh, retry failed requests, and open a story in the device browser.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen`.
- The API server must be running for the Expo preview to load countries and headlines.
- The country directory source is a public upstream feed; keep its response shape validated in the server proxy.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
