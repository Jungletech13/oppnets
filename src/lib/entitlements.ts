export function formatPrice(cents: number): string {
  if (cents === 0) return '$0';
  return `$${(cents / 100).toFixed(0)}`;
}

export const DRAFT_NOTICE = 'DRAFT — NOT FOUNDER APPROVED';
