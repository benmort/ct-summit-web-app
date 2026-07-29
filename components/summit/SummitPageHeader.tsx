type Props = {
  title: string;
  subtitle: string;
};

export default function SummitPageHeader({ title, subtitle }: Props) {
  return (
    <header className="space-y-2">
      <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink-300">
        <span className="h-px w-7 bg-brand-300/80" />
        {subtitle}
      </p>
      <h1 className="font-display text-4xl font-semibold leading-none text-ink-50">{title}</h1>
    </header>
  );
}
