// pgvector's text form: '[0.1,0.2,…]', passed as a parameter and cast with ::vector in SQL.
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
