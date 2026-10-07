# Consuming Country Pulse Design System in Expo apps

Read `artifacts/country-pulse-design-system/docs/AGENTS.md` first. React Native
does not consume the web CSS or DOM components. Import the portable native theme
and keep product data, navigation, and domain-specific compositions in Expo.
If the app still has a local palette or theme adapter, also read
`artifacts/country-pulse-design-system/docs/migrating-expo.md` before changing UI.

## Native theme and fonts

The package exports the token colors, numeric radius and spacing, and font-family
names:

```tsx
import {
  colorsForScheme,
  nativeTheme,
} from "@workspace/country-pulse-design-system/lib/native-theme";
import { useColorScheme } from "react-native";

const scheme = useColorScheme() === "dark" ? "dark" : "light";
const colors = colorsForScheme(scheme);
const cardRadius = nativeTheme.radius;
```

Keep the `useColorScheme` adapter local to the consuming app. Do not duplicate
token values. The source Country Pulse app already loads Inter 400/500/600/700
with `@expo-google-fonts/inter`; retain its font-loading and SplashScreen
behavior.

## Native components

The source app's country chip and news card are data-aware compositions. Keep
their React Native implementations in the Expo app; the design system's web
counterparts document their visual states but must not be imported into Expo.
Continue using React Native primitives for those app-owned components and get
colors, spacing, radius, and font-family values from `nativeTheme`.

## Assets

Metro resolves the workspace package through pnpm symlinks. Do not copy source or
token values. Loose binary assets may still need copying into Expo because Metro
does not watch sibling artifact folders by default.

Set `app.json`'s literal splash background from
`tokens.color.light.background` and keep it synchronized when that token changes.

## Verify

Import `nativeTheme` and render one app-owned component with its colors. Run Expo
typecheck and the development workflow, then verify both light and dark color
maps before changing broader screen styles.
