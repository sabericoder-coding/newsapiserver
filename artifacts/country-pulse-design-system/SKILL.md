# Country Pulse Design System

This design system was extracted from the existing Country Pulse Expo app.
`tokens.json` is the single source of truth for the mapped light and dark
palettes, Inter family, spacing base, and corner radius.

## Source-derived visual rules

- Use warm ivory for the reading canvas and deep teal for the primary text and
  hero surface.
- Coral marks editorial emphasis; lime identifies a live or selected state.
- Use Inter throughout. Small uppercase tracked labels identify sections;
  sentence-case headlines and body copy carry the main reading hierarchy.
- The mobile screen uses 20px horizontal gutters and a 4px spacing rhythm.
  Search fields and country chips use 15px corners; news cards use 18px.
- Keep publisher and recency above a news headline, with the read affordance
  below it.
- Keep short labels functional; the source uses direct actions such as “Read
  story”.

## Component set

The source-backed catalog contains `CountryChip` and `NewsCard`. Their source
locations, states, and implementation notes are in
`docs/references/component-inventory.md` and its per-component references.
Country and news data, screen composition, state, and navigation remain owned by
the mobile app.

## Source notes

The app's source muted text color was darkened slightly in the shared token set
to improve small-label contrast. The destructive color was also tuned for
readable foreground contrast. All other core source colors and both source
themes are retained.
