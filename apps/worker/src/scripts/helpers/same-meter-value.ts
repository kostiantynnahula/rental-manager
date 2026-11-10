// "19.70" equals "19.7" (trailing zeros don't matter); strings only, never Number(...).
export function sameMeterValue(a: string, b: string): boolean {
  const trim = (v: string) => (v.includes('.') ? v.replace(/0+$/, '').replace(/\.$/, '') : v);
  return trim(a) === trim(b);
}
