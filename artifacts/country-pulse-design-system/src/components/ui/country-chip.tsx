export type CountryChipProps = {
  label: string;
  flagUrl?: string | null;
  selected?: boolean;
  onSelect: () => void;
};

export function CountryChip({
  label,
  flagUrl,
  selected = false,
  onSelect,
}: CountryChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={[
        'inline-flex h-[49px] min-w-[122px] max-w-[190px] items-center gap-2 rounded-[15px] border px-[11px] text-left text-[13px] font-semibold transition-[opacity,background-color,border-color] duration-150 active:opacity-75',
        selected
          ? 'border-accent bg-accent text-accent-foreground'
          : 'border-border bg-card text-card-foreground hover:bg-muted',
      ].join(' ')}
    >
      {flagUrl ? (
        <img
          src={flagUrl}
          alt=""
          className="h-[18px] w-[26px] shrink-0 rounded-[4px] object-cover"
        />
      ) : (
        <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}
