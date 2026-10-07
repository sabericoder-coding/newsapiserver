---
name: NewsCard
description: Source contract and visual evidence for a tappable news briefing card.
---

## Source

- `artifacts/country-pulse/app/index.tsx`, lines 99–132.
- Called for each item in the country briefing list.
- The source uses React Native `Pressable`, `Text`, and Feather's
  `arrow-up-right` icon.

## Contract and appearance

- Source props: news item and `onPress`.
- The design-system adapter uses `publisher`, `publishedLabel`, `title`, and
  `onOpen`; date formatting and external browser navigation remain app-owned.
- Publisher and recency share the first row; publisher is coral, recency is
  muted. The headline is the strongest text element. “Read story” and an
  up-right arrow close the card.
- Card surface is near-white, with a subtle border, 16px padding, and 18px
  corners.
- The source dims the card while pressed.

## Implementation

The web adapter is a keyboard-operable button with an accessible read label.
The app retains ownership of the destination URL and opening behavior.
