// A big tappable option (icon, title, hint) — a choice that leads to the next step of a sheet.
export function ChoiceButton({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted active:bg-muted [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0"
    >
      {icon}
      <span className="flex flex-col">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
