import { useState } from 'react';
import { NewsCard } from '../../components/ui/news-card';

export function NewsCardDemo() {
  const [opened, setOpened] = useState(false);
  return (
    <section className="max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-7">
      <div>
        <h2 className="font-bold">Editorial news card</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Metadata is quiet; the headline carries the strongest visual weight.
        </p>
      </div>
      <NewsCard
        publisher="The New York Times"
        publishedLabel="3d ago"
        title="The Taliban Kicked the U.S. Out of Afghanistan. Now They Want It Back. - The New York Times"
        onOpen={() => setOpened((value) => !value)}
      />
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {opened ? 'Card selected.' : 'Select the card to test its interaction.'}
      </p>
    </section>
  );
}
