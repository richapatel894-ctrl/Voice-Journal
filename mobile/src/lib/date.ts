export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function localDayString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
