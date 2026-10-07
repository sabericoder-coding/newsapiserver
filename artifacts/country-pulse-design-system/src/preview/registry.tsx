import { lazy, type ComponentType } from 'react';
import {
  ColorsPage,
  FontsPage,
  LayoutPage,
  OverviewPage,
} from './foundations';

function lazyPage(load: () => Promise<ComponentType>) {
  return lazy(async () => ({ default: await load() }));
}

const BrandPage = lazyPage(() =>
  import('./source-pages').then(({ BrandPage }) => BrandPage),
);
const CountryChipDemo = lazyPage(() =>
  import('./demos/country-chip').then(({ CountryChipDemo }) => CountryChipDemo),
);
const NewsCardDemo = lazyPage(() =>
  import('./demos/news-card').then(({ NewsCardDemo }) => NewsCardDemo),
);
const MobileReferencePage = lazyPage(() =>
  import('./source-pages').then(({ MobileReferencePage }) => MobileReferencePage),
);

export type PreviewEntry = {
  id: string;
  name: string;
  description: string;
  Page: ComponentType;
};

export type NavGroup = {
  name: string;
  entries: PreviewEntry[];
};

export const DESIGN_SYSTEM = {
  title: 'Country Pulse Design System',
  description:
    'A warm editorial visual system for country discovery and current affairs.',
} as const;

export const OVERVIEW_ENTRY: PreviewEntry = {
  id: 'overview',
  name: 'Overview',
  description: 'The visual foundations and source components.',
  Page: OverviewPage,
};

export const NAV_GROUPS: NavGroup[] = [
  {
    name: 'Brand',
    entries: [
      {
        id: 'brand-mark',
        name: 'Brand mark',
        description: 'The original Country Pulse globe icon.',
        Page: BrandPage,
      },
    ],
  },
  {
    name: 'Colors',
    entries: [
      {
        id: 'color-roles',
        name: 'Color roles',
        description: 'Core, semantic, surface, and data colors.',
        Page: ColorsPage,
      },
    ],
  },
  {
    name: 'Fonts',
    entries: [
      {
        id: 'type-scale',
        name: 'Type scale',
        description: 'Inter weights and the compact editorial type scale.',
        Page: FontsPage,
      },
    ],
  },
  {
    name: 'Layout',
    entries: [
      {
        id: 'spacing-radius',
        name: 'Spacing and radius',
        description: 'The source app’s 4px rhythm, 20px gutters, and rounded surfaces.',
        Page: LayoutPage,
      },
    ],
  },
  {
    name: 'Components',
    entries: [
      {
        id: 'country-chip',
        name: 'Country chip',
        description: 'Flagged country selection with selected and idle states.',
        Page: CountryChipDemo,
      },
      {
        id: 'news-card',
        name: 'News card',
        description: 'Publisher, recency, headline, and read affordance.',
        Page: NewsCardDemo,
      },
    ],
  },
  {
    name: 'Applied examples',
    entries: [
      {
        id: 'mobile-home',
        name: 'Mobile home screen',
        description: 'A retained Country Pulse app-screen reference.',
        Page: MobileReferencePage,
      },
    ],
  },
];

export const ALL_ENTRIES: PreviewEntry[] = [
  OVERVIEW_ENTRY,
  ...NAV_GROUPS.flatMap((group) => group.entries),
];

const duplicateIds = ALL_ENTRIES.map((entry) => entry.id).filter(
  (id, index, ids) => ids.indexOf(id) !== index,
);
if (duplicateIds.length > 0) {
  throw new Error(`Duplicate preview page id(s): ${[...new Set(duplicateIds)].join(', ')}`);
}
