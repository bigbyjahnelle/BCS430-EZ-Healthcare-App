import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDataMode, getGeneration } from './dataMode';
import { supabase } from './supabase';

// Sample edits/preferences only. Never put API credentials or real records here.
export async function accountStorage(namespace: string) {
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    const owner = data.session?.user.id;
    if (!owner) throw new Error('Sign in before saving data.');
    const mode = getDataMode(), generation = getGeneration();
    const prefix = `ez.v2.${owner}.${mode}.${namespace}.`;
    async function check() {
        const { data: current } = await supabase!.auth.getSession();
        if (current.session?.user.id !== owner || getDataMode() !== mode || getGeneration() !== generation) {
            throw new Error('The account or data mode changed. Please try again.');
        }
    }
    return {
        async getItem(key: string) { await check(); return AsyncStorage.getItem(prefix + key); },
        async setItem(key: string, value: string) { await check(); await AsyncStorage.setItem(prefix + key, value); },
    };
}