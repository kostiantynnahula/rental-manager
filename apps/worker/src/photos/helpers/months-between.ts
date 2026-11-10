// Whole months from one period ("YYYY-MM") to another: "2026-09" → "2026-11" = 2.
export function monthsBetween(from: string, to: string): number {
  const months = (p: string) => {
    const [y, m] = p.split('-').map(Number);
    return y * 12 + m;
  };
  return months(to) - months(from);
}
