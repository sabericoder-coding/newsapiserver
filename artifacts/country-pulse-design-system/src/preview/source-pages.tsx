import countryPulseLogo from '../../docs/references/logos/country-pulse-mark.png';
import homeScreen from '../../docs/references/home-screen.jpg';

export function BrandPage() {
  return (
    <section className="max-w-2xl rounded-2xl border border-border bg-card p-6 text-card-foreground sm:p-8">
      <div className="flex flex-wrap items-center gap-6">
        <img
          src={countryPulseLogo}
          alt="Country Pulse globe mark"
          className="h-28 w-28 rounded-3xl object-cover"
        />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Original app icon</p>
          <h2 className="mt-2 text-xl font-bold">The globe mark</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Retained from the Country Pulse app assets. Use the supplied image
            rather than redrawing or recoloring the mark.
          </p>
        </div>
      </div>
    </section>
  );
}

export function MobileReferencePage() {
  return (
    <section className="grid gap-6 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:grid-cols-[minmax(0,300px)_1fr] sm:p-7">
      <img
        src={homeScreen}
        alt="Country Pulse mobile home screen showing the country selector and a news-loading state"
        className="mx-auto max-h-[720px] w-full max-w-[300px] rounded-2xl border border-border object-contain"
      />
      <div className="self-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Source reference</p>
        <h2 className="mt-2 text-xl font-bold">Mobile home screen</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This retained preview capture records the dark teal hero, warm neutral
          canvas, compact country rail, and clear separation between the directory
          and briefing.
        </p>
      </div>
    </section>
  );
}
