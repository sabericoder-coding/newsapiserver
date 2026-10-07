import { useState } from 'react';
import { CountryChip } from '../components/ui/country-chip';
import { NewsCard } from '../components/ui/news-card';
import { tokens } from '../generated/tokens';
import { Guidelines } from './parts';

const CORE_ROLES = ['primary', 'secondary', 'accent'] as const;
const SUPPORTING_ROLES = [
  'background',
  'foreground',
  'card',
  'muted',
  'mutedForeground',
  'border',
  'destructive',
  'chart1',
  'chart2',
  'chart3',
  'chart4',
  'chart5',
] as const;

function Swatch({ role }: { role: keyof typeof tokens.color.light }) {
  const value = tokens.color.light[role];
  return (
    <div className="min-w-0 space-y-2">
      <div
        className="flex h-16 items-end rounded-xl border border-border/70 p-2"
        style={{ backgroundColor: value }}
      >
        <span className="rounded-md bg-background/85 px-2 py-1 font-mono text-[10px] text-foreground">
          {value}
        </span>
      </div>
      <p className="break-words text-xs font-semibold">{role}</p>
    </div>
  );
}

export function OverviewPage() {
  const [selected, setSelected] = useState('Afghanistan');
  const [opened, setOpened] = useState(false);
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Core palette
            </p>
            <h2 className="mt-2 text-xl font-bold">A calm canvas with clear signals</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Warm paper and deep teal carry the reading experience. Coral marks
              emphasis; lime is reserved for live and selected states.
            </p>
          </div>
          <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
            LIVE
          </span>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {CORE_ROLES.map((role) => (
            <Swatch key={role} role={role} />
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Source components
            </p>
            <h2 className="mt-2 text-lg font-bold">Country selection</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <CountryChip
              label="Afghanistan"
              flagUrl="https://flagcdn.com/w80/af.png"
              selected={selected === 'Afghanistan'}
              onSelect={() => setSelected('Afghanistan')}
            />
            <CountryChip
              label="Åland Islands"
              flagUrl="https://flagcdn.com/w80/ax.png"
              selected={selected === 'Åland Islands'}
              onSelect={() => setSelected('Åland Islands')}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Selected: <span className="font-semibold text-foreground">{selected}</span>
          </p>
        </section>
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Editorial component
            </p>
            <h2 className="mt-2 text-lg font-bold">Latest briefing</h2>
          </div>
          <NewsCard
            publisher="The New York Times"
            publishedLabel="3d ago"
            title="The Taliban Kicked the U.S. Out of Afghanistan. Now They Want It Back. - The New York Times"
            onOpen={() => setOpened((value) => !value)}
          />
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {opened ? 'Article action selected in this preview.' : 'Select the card to preview its press state.'}
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          Source-derived guidance
        </p>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <Guidelines
            items={[
              { kind: 'do', text: 'Use lime for the selected country and live indicator.' },
              { kind: 'do', text: 'Use coral for small editorial labels and emphasis.' },
            ]}
          />
          <Guidelines
            items={[
              { kind: 'do', text: 'Keep publisher and recency above the headline.' },
              { kind: 'do', text: 'Keep controls and cards comfortably rounded.' },
            ]}
          />
        </div>
      </section>
    </div>
  );
}

export function ColorsPage() {
  return (
    <div className="space-y-8 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-7">
      <section className="space-y-4">
        <div>
          <h2 className="font-bold">Core palette</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The three roles that establish the Country Pulse identity.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {CORE_ROLES.map((role) => <Swatch key={role} role={role} />)}
        </div>
      </section>
      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <h2 className="font-bold">Supporting roles</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Surface, text, border, feedback, and data colors.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {SUPPORTING_ROLES.map((role) => <Swatch key={role} role={role} />)}
        </div>
      </section>
      <Guidelines
        items={[
          { kind: 'do', text: 'Keep the warm paper background and deep teal text as the default reading surface.' },
          { kind: 'do', text: 'Use lime for live or selected states, not as a replacement for the coral primary.' },
        ]}
      />
    </div>
  );
}

const TYPE_ROWS = [
  { label: 'Hero', size: 25, weight: 700, sample: 'World, in motion.' },
  { label: 'Section', size: 22, weight: 700, sample: '249 countries' },
  { label: 'Headline', size: 17, weight: 600, sample: 'A current story worth reading' },
  { label: 'Body', size: 14, weight: 400, sample: 'Tap a country to get the headlines shaping its day.' },
  { label: 'Country label', size: 13, weight: 600, sample: 'Afghanistan' },
  { label: 'Metadata', size: 11, weight: 700, sample: 'THE NEW YORK TIMES · 3D AGO' },
] as const;

export function FontsPage() {
  return (
    <div className="space-y-7 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-7">
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Font family</p>
        <h2 className="mt-3 text-4xl font-bold">Inter</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Inter is used for headings, body copy, labels, and metadata.
        </p>
      </section>
      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="font-bold">Type scale from the mobile screen</h2>
        {TYPE_ROWS.map((entry) => (
          <div key={entry.label} className="grid gap-2 border-b border-border/70 py-3 sm:grid-cols-[140px_1fr]">
            <span className="text-xs font-semibold text-muted-foreground">
              {entry.label} · {entry.size}px / {entry.weight}
            </span>
            <p style={{ fontSize: entry.size, fontWeight: entry.weight, lineHeight: 1.35 }}>
              {entry.sample}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

const SPACING = [4, 8, 12, 16, 20, 24, 28] as const;

export function LayoutPage() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
        <h2 className="font-bold">Spacing rhythm</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A 4px base step; the mobile screen uses 20px horizontal gutters.
        </p>
        <div className="mt-6 space-y-4">
          {SPACING.map((size) => (
            <div key={size} className="flex items-center gap-4">
              <span className="w-10 font-mono text-xs text-muted-foreground">{size}px</span>
              <div className="h-3 rounded-full bg-primary" style={{ width: size * 3 }} />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
        <h2 className="font-bold">Corner treatments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Source cards use an 18px radius; chips and search fields use 15px.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          {[
            { label: 'Search · 15px', radius: 15 },
            { label: 'News card · 18px', radius: 18 },
            { label: 'Theme base · 20px', radius: 20 },
            { label: 'Pill · 999px', radius: 999 },
          ].map(({ label, radius }) => (
            <div
              key={label}
              className="flex h-24 items-end border border-border bg-secondary p-3 text-sm font-semibold"
              style={{ borderRadius: radius }}
            >
              {label}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
