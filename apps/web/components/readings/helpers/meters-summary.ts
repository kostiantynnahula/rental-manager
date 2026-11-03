// Ukrainian plural for "N лічильник(и/ів)".
export function metersSummary(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} лічильник`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} лічильники`;
  return `${count} лічильників`;
}
