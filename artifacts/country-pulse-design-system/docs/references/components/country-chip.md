---
name: CountryChip
description: Source contract and visual evidence for the selectable country chip.
---

## Source

- `artifacts/country-pulse/app/index.tsx`, lines 54–97.
- Called from the horizontal country rail in the home screen.
- The source uses React Native `Pressable`, `Image`, `Text`, and the app's
  semantic color hook.

## Contract and appearance

- Source props: country object, `selected`, and `onPress`.
- The design-system adapter uses `label`, optional `flagUrl`, `selected`, and
  `onSelect` so it can be used without the app's country-data package.
- Selected state uses the lime accent with dark teal text; idle state uses a
  card surface, border, and default foreground.
- Flag is 26×18px with a 4px radius. Missing flags show a circular initial.
- Chip height is 49px, horizontal padding is 11px, gap is 8px, and corner
  radius is 15px.
- The source dims the chip while pressed.

## Implementation

The web adapter uses a native button with `aria-pressed`; the mobile screen
remains responsible for country data and briefing selection.
