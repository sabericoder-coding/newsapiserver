# Migrating Expo UI to Country Pulse Design System

Read `artifacts/country-pulse-design-system/docs/AGENTS.md` and
`artifacts/country-pulse-design-system/docs/consuming-expo.md` first. Use this guide
when an Expo app, including a fresh scaffold, has local theme, hooks, fonts, or
product-agnostic component implementations.

## Rewrite theme and font imports

Grep the Expo artifact for `@/constants/colors`, `@/hooks/useColors`, local
`useFonts` calls, and direct font imports. Read every matching scaffold and app
file before deleting anything.

- Rewrite app color mappings to use `colorsForScheme` or `nativeTheme` from
  `@workspace/country-pulse-design-system/lib/native-theme`. Keep the app-local
  hook that selects the current scheme with React Native's `useColorScheme`.
- Keep the root layout's existing Inter font loading and SplashScreen gating;
  the font is already an app dependency.
- Delete duplicated palette values from `constants/colors.ts`; keep an app-local
  `useColors` adapter if it still selects the platform color scheme.
- Remove local palette interfaces, token mappings, font registrations, and
  color-scheme logic now supplied by this package.

## Replace product-agnostic UI

Inventory inline and app-local styled controls before migrating screens.

- Keep the app's country and news compositions local. The source app does not
  define a separate native primitive library to replace them with.
- Do not import web `components/ui/*`, `styles.css`, or DOM/Tailwind code into
  React Native.

## Clean dependencies and verify

- Keep the design-system workspace package in Expo `dependencies`.
- Remove dependencies used only by deleted local implementations.
- Remove duplicate local copies of the palette after all consumers use the
  package tokens.
- Grep for the old local palette imports and resolve every hit.
- Run Expo typecheck and the development workflow; verify the native theme and
  both color schemes before presenting the app.

Migration is complete when Expo imports shared visual tokens from
`@workspace/country-pulse-design-system` and retains its app-specific screen
compositions locally.
