// Public client configuration shared by the team.
// These values are intentionally included in the APK.
//
// Never put service-role keys, SMTP passwords, encryption keys,
// or Epic access tokens in this file.

export const PUBLIC_CONFIG = Object.freeze({
    supabaseUrl: 'https://mmurlxdjbzvctegytiao.supabase.co',
    supabasePublishableKey:
        'sb_publishable_ZcI1DsUpyw3O8kzRtyzBqA_M-WZdBYn',
});

export const HEALTHCARE_API_URL =
    `${PUBLIC_CONFIG.supabaseUrl}/functions/v1/healthcare`;