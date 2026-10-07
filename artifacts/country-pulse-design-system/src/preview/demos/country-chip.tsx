import { useState } from 'react';
import { CountryChip } from '../../components/ui/country-chip';

export function CountryChipDemo() {
  const [selected, setSelected] = useState('Afghanistan');
  const options = [
    { name: 'Afghanistan', flag: 'https://flagcdn.com/w80/af.png' },
    { name: 'Åland Islands', flag: 'https://flagcdn.com/w80/ax.png' },
    { name: 'Albania', flag: 'https://flagcdn.com/w80/al.png' },
  ];
  return (
    <section className="max-w-3xl space-y-5 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-7">
      <div>
        <h2 className="font-bold">Selectable country chips</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A selected chip uses the lime accent; idle chips stay on the card surface.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((country) => (
          <CountryChip
            key={country.name}
            label={country.name}
            flagUrl={country.flag}
            selected={selected === country.name}
            onSelect={() => setSelected(country.name)}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Selected country: <span className="font-semibold text-foreground">{selected}</span>
      </p>
    </section>
  );
}
