import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';

import { PUBLIC_CONFIG } from '../config/publicConfig';

export const supabase = createClient(
    PUBLIC_CONFIG.supabaseUrl,
    PUBLIC_CONFIG.supabasePublishableKey,
    {
        auth: {
            storage: AsyncStorage,
            persistSession: false,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            lock: processLock,
        },
    }
);