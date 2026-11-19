/**
 * Iniciais para avatar sem foto: "Bistrô do Zé" -> "BZ" (ou "B" com max = 1).
 *
 * Partes sem nenhuma letra ("&", "-", "2") sao ignoradas para o avatar nao
 * virar "B&". Nome vazio devolve string vazia.
 */
export function initials(name: string, max: 1 | 2 = 2): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => /\p{L}/u.test(part));

  if (parts.length === 0) {
    return '';
  }

  const first = parts[0].charAt(0);
  const last = max === 2 && parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';

  return (first + last).toUpperCase();
}
