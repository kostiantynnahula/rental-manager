import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface MeterActionItemProps {
  icon: React.ReactNode;
  label: string;
  // Shown as a second line and disables the item.
  disabledReason: string | null;
  onSelect?: () => void;
  destructive?: boolean;
  asChild?: boolean;
  children?: React.ReactNode;
}

// A menu item that, when unavailable, stays visible with a short reason instead of disappearing.
export function MeterActionItem({
  icon,
  label,
  disabledReason,
  onSelect,
  destructive,
  asChild,
  children,
}: MeterActionItemProps) {
  const content = (
    <>
      {icon}
      <span className="flex flex-col">
        <span>{label}</span>
        {disabledReason && <span className="text-xs text-muted-foreground">{disabledReason}</span>}
      </span>
    </>
  );
  return (
    <DropdownMenuItem
      disabled={disabledReason !== null}
      onSelect={onSelect}
      variant={destructive ? 'destructive' : 'default'}
      asChild={asChild && !disabledReason}
    >
      {asChild && !disabledReason && children ? children : content}
    </DropdownMenuItem>
  );
}
