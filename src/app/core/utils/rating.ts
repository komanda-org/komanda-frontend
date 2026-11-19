export type StarFill = 'full' | 'half' | 'empty';

export function formatRating(rating: number): string {
  return rating.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Arredonda para a meia estrela mais proxima: 4,9 desenha 5 cheias, igual ao numero mostrado.
export function starFills(rating: number): StarFill[] {
  const rounded = Math.round(rating * 2) / 2;
  return [1, 2, 3, 4, 5].map((position) => {
    if (rounded >= position) return 'full';
    if (rounded >= position - 0.5) return 'half';
    return 'empty';
  });
}
