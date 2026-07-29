type Props = {
  variant?: "album" | "home" | "heroDark";
};

export default function EmptyState({ variant = "album" }: Props) {
  if (variant === "heroDark") {
    return (
      <p className="text-center text-sm text-ink-50/60">
        <span className="md:hidden">
          Nothing selected yet. Choose from your library or use photo / video
          capture.
        </span>
        <span className="hidden md:inline">
          Nothing selected yet. Choose from your library.
        </span>
      </p>
    );
  }
  if (variant === "home") {
    return (
      <p className="text-center text-sm text-ink-400">
        <span className="md:hidden">
          Nothing selected yet. Choose from your library or use photo / video
          capture.
        </span>
        <span className="hidden md:inline">
          Nothing selected yet. Choose from your library.
        </span>
      </p>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <div className="rounded-2xl bg-veil/10 px-5 py-4 text-4xl" aria-hidden>
        🖼️
      </div>
      <h2 className="text-lg font-medium text-ink-100">No photos yet</h2>
      <p className="max-w-xs text-sm leading-relaxed text-ink-400">
        <span className="md:hidden">
          Be the first to add a moment. Use the card above to upload or capture
          from your phone.
        </span>
        <span className="hidden md:inline">
          Be the first to add a moment. Use the card above to upload.
        </span>
      </p>
    </div>
  );
}
