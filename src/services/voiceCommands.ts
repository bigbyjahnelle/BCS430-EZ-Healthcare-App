// Ask EZ voice commands: turns what the user said into an app action - RD
// Matching is simple keyword matching (no AI): each command lists the words
// and phrases people are likely to say for it - RD

export type AppRoute =
    | '/home'
    | '/medications'
    | '/appointments'
    | '/reminders'
    | '/profile'
    | '/messages'
    | '/insurance'
    | '/share'
    | '/help'
    | '/connect-epic'
    | '/my-providers'
    | '/test-results'
    | '/accessibility'
    | '/voice-settings';

export type VoiceAction =
    | { type: 'navigate'; route: AppRoute; label: string }
    | { type: 'back' }
    | { type: 'read' }
    | { type: 'help' }
    | { type: 'cancel' };

type Command = { action: VoiceAction; phrases: string[] };

// Order matters only for ties: when two commands match equally well,
// the one listed first wins (e.g. "medication reminders" → Reminders) - RD
const COMMANDS: Command[] = [
    {
        action: { type: 'navigate', route: '/home', label: 'Home' },
        phrases: ['home', 'home screen', 'go home', 'back home', 'main menu', 'main screen', 'start over'],
    },
    {
        action: { type: 'navigate', route: '/reminders', label: 'Reminders' },
        phrases: ['reminder', 'reminders', 'alarm', 'alarms', 'dose', 'doses', 'todays doses',
            'medication reminders', 'pill reminders', 'when do i take'],
    },
    {
        action: { type: 'navigate', route: '/test-results', label: 'Test Results' },
        phrases: ['test results', 'test result', 'my results', 'results', 'lab', 'labs', 'lab results',
            'blood work', 'bloodwork', 'blood test', 'blood tests', 'tests'],
    },
    {
        action: { type: 'navigate', route: '/medications', label: 'Medications' },
        phrases: ['medication', 'medications', 'medicine', 'medicines', 'meds', 'pill', 'pills',
            'prescription', 'prescriptions', 'drugs'],
    },
    {
        action: { type: 'navigate', route: '/appointments', label: 'Appointments' },
        phrases: ['appointment', 'appointments', 'my appointments', 'visit', 'visits', 'doctor visit',
            'doctors appointment', 'checkup', 'check up'],
    },
    {
        // My Health and Profile are the same screen; Home's Profile button opens /profile - RD
        action: { type: 'navigate', route: '/profile', label: 'Profile' },
        phrases: ['my health', 'health', 'profile', 'my profile', 'about me', 'my information', 'my info',
            'my details', 'personal information', 'vitals', 'vital signs', 'blood pressure',
            'heart rate', 'pulse', 'temperature', 'weight', 'oxygen'],
    },
    {
        action: { type: 'navigate', route: '/messages', label: 'Messages' },
        phrases: ['message', 'messages', 'my messages', 'inbox', 'mail', 'email my doctor', 'message my doctor'],
    },
    {
        action: { type: 'navigate', route: '/insurance', label: 'Insurance' },
        phrases: ['insurance', 'my insurance', 'insurance card', 'coverage', 'health plan', 'member id'],
    },
    {
        action: { type: 'navigate', route: '/share', label: 'Share' },
        phrases: ['share', 'share my records', 'share my information', 'send my records'],
    },
    {
        action: { type: 'navigate', route: '/connect-epic', label: 'Epic Connection' },
        phrases: ['epic', 'connect to epic', 'connect epic', 'epic connection', 'my chart', 'mychart'],
    },
    {
        // Multi-word so a plain "help" still shows the Ask EZ voice tips - RD
        action: { type: 'navigate', route: '/help', label: 'Help' },
        phrases: ['help screen', 'help page', 'user guide', 'how to use the app', 'how do i use this app'],
    },
    {
        action: { type: 'navigate', route: '/my-providers', label: 'My Providers' },
        phrases: ['provider', 'providers', 'my providers', 'doctor', 'doctors', 'my doctor', 'physician',
            'physicians', 'nurse', 'care team'],
    },
    {
        // Listed before Settings so "voice settings" opens the voice page, not the main settings - RD
        action: { type: 'navigate', route: '/voice-settings', label: 'Voice Settings' },
        phrases: ['voice settings', 'voice setting', 'speech settings', 'speaking speed', 'speech speed',
            'talking speed', 'voice options'],
    },
    {
        action: { type: 'navigate', route: '/accessibility', label: 'Settings' },
        phrases: ['settings', 'setting', 'accessibility', 'text size', 'bigger text', 'larger text',
            'font size', 'font', 'text bigger', 'contrast', 'display'],
    },
    {
        // Multi-word phrases so "read" beats a single matching screen word - RD
        action: { type: 'read' },
        phrases: ['read', 'read this', 'read this screen', 'read the screen', 'read it', 'read to me',
            'read it to me', 'read aloud', 'read out loud', 'whats on this screen', 'what is on this screen',
            'whats on the screen', 'what does this say', 'what does it say', 'tell me whats here'],
    },
    {
        action: { type: 'back' },
        phrases: ['back', 'go back', 'previous', 'previous screen', 'last screen', 'return'],
    },
    {
        action: { type: 'help' },
        phrases: ['help', 'what can i say', 'what can you do', 'commands', 'options', 'how does this work'],
    },
    {
        action: { type: 'cancel' },
        phrases: ['cancel', 'never mind', 'nevermind', 'stop', 'close', 'nothing', 'exit'],
    },
];

/** Examples shown on screen and read out for "help" - RD */
export const EXAMPLE_COMMANDS = [
    'Open my medications',
    'Read this screen',
    'Show my reminders',
    'My appointments',
    'My health',
    'My doctors',
    'Test results',
    'Settings',
    'Go home',
    'Go back',
];

/** Words that help the recognizer expect our vocabulary - RD */
export const VOCABULARY = ['EZ', 'medications', 'reminders', 'vitals', 'providers', 'test results', 'lab results'];

/** Lowercase, drop apostrophes and punctuation, collapse spaces - RD */
export function normalize(text: string) {
    return text
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/**
 * Finds the best command for one transcript. The command whose matching
 * phrase has the most words wins ("test results" beats "results"); ties go to
 * the command listed first. Returns null when nothing matches - RD
 */
export function matchCommand(transcript: string): VoiceAction | null {
    const text = ` ${normalize(transcript)} `;
    if (!text.trim()) return null;

    let best: { action: VoiceAction; words: number } | null = null;
    for (const command of COMMANDS) {
        for (const phrase of command.phrases) {
            if (!text.includes(` ${phrase} `)) continue;
            const words = phrase.split(' ').length;
            if (!best || words > best.words) best = { action: command.action, words };
        }
    }
    return best?.action ?? null;
}

/** Tries each alternative the recognizer heard, most likely first - RD */
export function matchAny(transcripts: string[]): { action: VoiceAction; heard: string } | null {
    for (const heard of transcripts) {
        const action = matchCommand(heard);
        if (action) return { action, heard };
    }
    return null;
}

export function describeAction(action: VoiceAction) {
    switch (action.type) {
        case 'navigate': return `Opening ${action.label}.`;
        case 'back': return 'Going back.';
        case 'read': return 'Reading this screen.';
        case 'help': return `You can say things like: ${EXAMPLE_COMMANDS.slice(0, 5).join(', ')}.`;
        case 'cancel': return 'Okay.';
    }
}
