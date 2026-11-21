import { selectDataMode } from './dataMode';
import { clearEpicAttempt, disconnectEpic } from './epicConnection';
import { suspendReminderNotifications } from './reminders';
import { supabase } from './supabase';

export async function logout() {
    if (!supabase) throw new Error('Supabase is not configured.');
    // Attempt remote disconnection before logout. An offline logout must still
    // clear the app session; any unconfirmed server connection expires shortly.
    let remoteError = false;
    try { await disconnectEpic(); } catch { remoteError = true; }
    await suspendReminderNotifications().catch(() => undefined);
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    clearEpicAttempt(); selectDataMode('sample');
    // Short-lived server tokens expire even if the user is offline at logout.
    if (remoteError) console.warn('Epic disconnect could not be confirmed. The hosted connection will expire.');
}