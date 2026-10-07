export type NewsCardProps = {
  publisher: string;
  publishedLabel: string;
  title: string;
  onOpen: () => void;
};

export function NewsCard({
  publisher,
  publishedLabel,
  title,
  onOpen,
}: NewsCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Read ${title} from ${publisher}`}
      className="block w-full rounded-[18px] border border-border bg-card p-4 text-left text-card-foreground transition-[opacity,border-color] duration-150 hover:border-primary/40 active:opacity-75"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[11px] font-bold tracking-[0.02em] text-primary">
          {publisher}
        </span>
        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
          {publishedLabel}
        </span>
      </span>
      <span className="mt-2 block text-[17px] font-semibold leading-[1.35] tracking-[-0.012em]">
        {title}
      </span>
      <span className="mt-4 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
        <span>Read story</span>
        <span aria-hidden="true" className="text-[15px] leading-none">↗</span>
      </span>
    </button>
  );
}
