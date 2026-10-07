/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#f5f3ee",
      "foreground": "#10232b",
      "border": "#d4ddd8",
      "card": "#fffdf8",
      "cardForeground": "#10232b",
      "popover": "#fffdf8",
      "popoverForeground": "#10232b",
      "primary": "#ef6b4a",
      "primaryForeground": "#10232b",
      "secondary": "#ddeae6",
      "secondaryForeground": "#10232b",
      "muted": "#ece8e0",
      "mutedForeground": "#53635f",
      "accent": "#d6e870",
      "accentForeground": "#10232b",
      "destructive": "#b3453c",
      "destructiveForeground": "#fffdf8",
      "input": "#d4ddd8",
      "ring": "#ef6b4a",
      "chart1": "#ef6b4a",
      "chart2": "#5d927f",
      "chart3": "#2c6971",
      "chart4": "#c4a540",
      "chart5": "#bb6257",
      "sidebar": "#10232b",
      "sidebarForeground": "#f5f3ee",
      "sidebarBorder": "#2d4748",
      "sidebarPrimary": "#ef6b4a",
      "sidebarPrimaryForeground": "#10232b",
      "sidebarAccent": "#203a3d",
      "sidebarAccentForeground": "#f5f3ee",
      "sidebarRing": "#d6e870"
    },
    "dark": {
      "background": "#0d1c21",
      "foreground": "#f5f3ee",
      "border": "#2d4748",
      "card": "#13282f",
      "cardForeground": "#f5f3ee",
      "popover": "#13282f",
      "popoverForeground": "#f5f3ee",
      "primary": "#ff8a68",
      "primaryForeground": "#10232b",
      "secondary": "#203a3d",
      "secondaryForeground": "#f5f3ee",
      "muted": "#1a3237",
      "mutedForeground": "#b6c8c2",
      "accent": "#d6e870",
      "accentForeground": "#10232b",
      "destructive": "#e27468",
      "destructiveForeground": "#10232b",
      "input": "#2d4748",
      "ring": "#ff8a68",
      "chart1": "#ff8a68",
      "chart2": "#8cc6af",
      "chart3": "#79b8c2",
      "chart4": "#d6e870",
      "chart5": "#f4a28f",
      "sidebar": "#071418",
      "sidebarForeground": "#f5f3ee",
      "sidebarBorder": "#2d4748",
      "sidebarPrimary": "#d6e870",
      "sidebarPrimaryForeground": "#10232b",
      "sidebarAccent": "#203a3d",
      "sidebarAccentForeground": "#f5f3ee",
      "sidebarRing": "#ff8a68"
    }
  },
  "fontFamily": {
    "sans": [
      "Inter",
      "sans-serif"
    ],
    "serif": [
      "Georgia",
      "serif"
    ],
    "mono": [
      "Menlo",
      "monospace"
    ]
  },
  "radius": "1.25rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
