export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function localDayString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDayHeader(day: string): string {
  const today = localDayString();
  const yesterday = localDayString(new Date(Date.now() - 86400000));
  if (day === today) return 'Today';
  if (day === yesterday) return 'Yesterday';
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: y === new Date().getFullYear() ? undefined : 'numeric',
  });
}

export function formatMonthYear(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const GREETING_BY_HOUR: [max: number, greeting: string][] = [
  [12, 'Good morning'],
  [17, 'Good afternoon'],
  [24, 'Good evening'],
];

export function timeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  return GREETING_BY_HOUR.find(([max]) => hour < max)?.[1] ?? 'Good evening';
}
