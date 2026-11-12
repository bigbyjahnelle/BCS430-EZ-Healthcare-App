import { useSyncExternalStore } from 'react';
export type DataMode = 'sample' | 'api';
let mode: DataMode = 'api';
let generation = 0;
const listeners = new Set<() => void>();
export const mobileSession: { token: string | null } = { token: null };
export function getDataMode() { return mode; }
export function getGeneration() { return generation; }
export function selectDataMode(next: DataMode) {
    mode = next;
    generation += 1;
    mobileSession.token = null;
    listeners.forEach((notify) => notify());
}
function subscribe(notify: () => void) {
    listeners.add(notify);
    return () => { listeners.delete(notify); };
}
export function useDataMode() { return useSyncExternalStore(subscribe, getDataMode, getDataMode); }
export function useModeGeneration() { return useSyncExternalStore(subscribe, getGeneration, getGeneration); }
export function modeLabel(mode: DataMode) {
    return mode === 'sample' ? 'Sample Data Mode — fictional records' : 'API Mode — Epic sandbox';
}