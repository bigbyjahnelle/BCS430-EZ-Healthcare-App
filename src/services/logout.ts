import { getDataMode, selectDataMode } from './dataMode';
import { supabase } from './supabase';

export async function logout() {
    if (!supabase) {
        throw new Error('Supabase is not configured.');
    }

    // Sign out on this device without signing out the user's other devices.
    const { error } = await supabase.auth.signOut({ scope: 'local' });

    if (error) {
        throw error;
    }

    // Keep the selected mode, but discard this app's Epic connection token.
    selectDataMode(getDataMode());
}