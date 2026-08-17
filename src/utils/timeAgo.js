const UNITS = [
  { limit: 60, divisor: 1, label: 'agora' },
  { limit: 3600, divisor: 60, label: 'min' },
  { limit: 86400, divisor: 3600, label: 'h' },
  { limit: 604800, divisor: 86400, label: 'dias' },
];

export function formatTimeAgo(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return typeof dateInput === 'string' ? dateInput : '';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  for (const { limit, divisor, label } of UNITS) {
    if (diffSeconds < limit) {
      if (label === 'agora') return 'agora';
      const value = Math.floor(diffSeconds / divisor);
      return `${value}${label.length <= 2 ? label : ` ${label}`}`;
    }
  }

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
