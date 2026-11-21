import * as WebBrowser from 'expo-web-browser';
import { getDataMode, getGeneration } from './dataMode';
import { hosted } from './healthcare';
let pending: { id: string; generation: number } | null = null;
export function clearEpicAttempt() { pending = null; }
export async function checkEpicConnection() { return hosted<{ connected: boolean; expiresAt: string | null }>('connection'); }
export async function finishEpicConnection() {
    if (pending) {
        if (pending.generation !== getGeneration() || getDataMode() !== 'api') throw new Error('The data mode changed.');
        const status = await hosted<{ status: string }>(`attempt/${pending.id}`);
        if (status.status !== 'complete') throw new Error(status.status === 'failed' ? 'Epic authorization failed. Check the callback registration and backend configuration.' : 'Epic sign-in is not complete or has expired. Start a fresh connection.');
    }
    const result = await checkEpicConnection();
    if (!result.connected) throw new Error('No active Epic connection. Start a fresh sign-in.');
    pending = null;
    return result;
}
export async function connectEpic() {
    if (getDataMode() !== 'api') throw new Error('Select API Mode to connect to Epic.');
    const generation = getGeneration();
    const started = await hosted<{ id: string; loginUrl: string }>('start', 'POST');
    if (generation !== getGeneration() || getDataMode() !== 'api') throw new Error('The data mode changed.');
    const login = new URL(started.loginUrl);
    if (login.protocol !== 'https:' || login.hostname !== 'fhir.epic.com') throw new Error('Unexpected Epic sign-in address.');
    pending = { id: started.id, generation };
    const result = await WebBrowser.openAuthSessionAsync(started.loginUrl, 'ezhealthcare://connect-epic');
    if (generation !== getGeneration()) throw new Error('The data mode changed.');
    if (result.type === 'success') {
        const url = new URL(result.url);
        if (url.protocol !== 'ezhealthcare:' || url.hostname !== 'connect-epic' || url.searchParams.get('attempt') !== started.id) throw new Error('The Epic return link could not be verified.');
    }
    // Server-side status, not the deep-link text, determines success.
    return finishEpicConnection();
}
export async function disconnectEpic() {
    await hosted('connection', 'DELETE'); pending = null;
}