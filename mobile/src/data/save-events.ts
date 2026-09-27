import type { Entry } from '@/data/types';

/**
 * A save happens on the recorder or composer screen, but the "Saved" toast
 * and the streak/list refresh happen on Home — those screens aren't
 * mounted at the same time (the recorder/composer are modals over Home), so
 * this is a minimal pub/sub bridge rather than routing save state through
 * navigation params.
 */
type Listener = (entry: Entry) => void;

const listeners = new Set<Listener>();

export function onEntrySaved(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitEntrySaved(entry: Entry): void {
  for (const listener of listeners) listener(entry);
}
