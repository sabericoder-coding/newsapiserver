import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import countryPulseLogo from '../../docs/references/logos/country-pulse-mark.png';
import {
  ALL_ENTRIES,
  DESIGN_SYSTEM,
  NAV_GROUPS,
  OVERVIEW_ENTRY,
  type NavGroup,
} from './registry';

function readHashId(): string {
  const id = new URLSearchParams(window.location.hash.slice(1)).get('page');
  return id && ALL_ENTRIES.some((entry) => entry.id === id)
    ? id
    : OVERVIEW_ENTRY.id;
}

function NavigationItems({
  showOverview,
  groups,
  activeId,
  query,
  select,
}: {
  showOverview: boolean;
  groups: NavGroup[];
  activeId: string;
  query: string;
  select: (id: string) => void;
}) {
  return (
    <nav aria-label="Design system navigation" className="space-y-5 py-2">
      {showOverview ? (
        <button
          type="button"
          onClick={() => select(OVERVIEW_ENTRY.id)}
          aria-current={OVERVIEW_ENTRY.id === activeId}
          className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-secondary aria-[current=true]:bg-accent aria-[current=true]:text-accent-foreground"
        >
          {OVERVIEW_ENTRY.name}
        </button>
      ) : null}
      {groups.map((group) => (
        <div key={group.name}>
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {group.name}
          </p>
          <div className="mt-2 space-y-1">
            {group.entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => select(entry.id)}
                aria-current={entry.id === activeId}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary aria-[current=true]:bg-accent aria-[current=true]:font-semibold aria-[current=true]:text-accent-foreground"
              >
                {entry.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      {!showOverview && groups.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">
          No sections match “{query}”.
        </p>
      ) : null}
    </nav>
  );
}

export function DesignSystemBrowser() {
  const [selectedId, setSelectedId] = useState(readHashId);
  const [query, setQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const mobileNav = useRef<HTMLDetailsElement>(null);
  const mobileNavSummary = useRef<HTMLElement>(null);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    const onHashChange = () => setSelectedId(readHashId());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const filteredGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        entries: group.name.toLowerCase().includes(normalizedQuery)
          ? group.entries
          : group.entries.filter((entry) =>
              `${entry.name} ${entry.description}`
                .toLowerCase()
                .includes(normalizedQuery),
            ),
      })).filter((group) => group.entries.length > 0),
    [normalizedQuery],
  );
  const active =
    ALL_ENTRIES.find((entry) => entry.id === selectedId) ?? OVERVIEW_ENTRY;
  const activeGroup = NAV_GROUPS.find((group) =>
    group.entries.some((entry) => entry.id === active.id),
  );
  const ActivePage = active.Page;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [active.id]);

  const showOverview = `${OVERVIEW_ENTRY.name} ${OVERVIEW_ENTRY.description}`
    .toLowerCase()
    .includes(normalizedQuery);
  const selectPage = (id: string) => {
    setSelectedId(id);
    window.location.hash = new URLSearchParams({ page: id }).toString();
    if (mobileNav.current?.open) {
      mobileNav.current.removeAttribute('open');
      mobileNavSummary.current?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground md:grid md:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <img
            src={countryPulseLogo}
            alt=""
            className="h-10 w-10 rounded-xl object-cover"
          />
          <div>
            <p className="text-sm font-bold">{DESIGN_SYSTEM.title}</p>
            <p className="mt-1 text-xs text-sidebar-foreground/70">
              Source-derived system
            </p>
          </div>
        </div>
        <div className="p-4 pb-2">
          <label className="sr-only" htmlFor="design-system-search">
            Search design system
          </label>
          <input
            id="design-system-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search design system…"
            className="h-10 w-full rounded-xl border border-sidebar-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          />
        </div>
        <div className="hidden min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:block">
          <NavigationItems
            showOverview={showOverview}
            groups={filteredGroups}
            activeId={active.id}
            query={query}
            select={selectPage}
          />
        </div>
        <details ref={mobileNav} className="border-t border-sidebar-border px-4 py-3 md:hidden">
          <summary
            ref={mobileNavSummary}
            className="cursor-pointer text-sm font-semibold"
          >
            Browse sections: <span className="font-normal">{active.name}</span>
          </summary>
          <div className="mt-3 max-h-64 overflow-y-auto pb-2">
            <NavigationItems
              showOverview={showOverview}
              groups={filteredGroups}
              activeId={active.id}
              query={query}
              select={selectPage}
            />
          </div>
        </details>
      </aside>

      <main className="min-w-0 px-5 py-8 sm:px-9 sm:py-10 lg:px-14">
        <div className="mx-auto max-w-5xl">
          <header className="flex items-start justify-between gap-5 border-b border-border pb-7">
            <div>
              {active.id === OVERVIEW_ENTRY.id ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                    Country Pulse · Visual language
                  </p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                    {DESIGN_SYSTEM.title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-muted-foreground">
                    {DESIGN_SYSTEM.description}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                    {activeGroup?.name}
                  </p>
                  <h1 className="mt-2 text-2xl font-bold">{active.name}</h1>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    {active.description}
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              aria-pressed={darkMode}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-card-foreground transition-colors hover:bg-secondary"
            >
              {darkMode ? 'Switch to light' : 'Switch to dark'}
            </button>
          </header>
          <div className="pt-8">
            <Suspense
              fallback={
                <div role="status" className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                  Loading preview…
                </div>
              }
            >
              <ActivePage />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
