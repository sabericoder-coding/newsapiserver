import { tokens } from '../generated/tokens';

export type NativeColorScheme = 'light' | 'dark';

function toPixels(value: string): number {
  const numeric = Number.parseFloat(value);
  return value.endsWith('rem') ? numeric * 16 : numeric;
}

export const nativeTheme = {
  colors: tokens.color,
  radius: toPixels(tokens.radius),
  spacing: toPixels(tokens.spacing),
  fontFamily: {
    sans: 'Inter',
    serif: 'Georgia',
    mono: 'Menlo',
  },
} as const;

export function colorsForScheme(scheme: NativeColorScheme) {
  return nativeTheme.colors[scheme];
}
