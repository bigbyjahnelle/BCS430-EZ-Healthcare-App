// Uses compiled TypeScript and a fake local account/storage. No network.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const root = '/tmp/ez-healthcare-service-tests/src';
let user = 'alice';
const values = new Map();
const originalLoad = Module._load;
Module._load = function(request, parent, ...rest) {
    if (request === '@react-native-async-storage/async-storage') return {
        __esModule: true, default: {
            async getItem(key) { return values.get(key) ?? null; },
            async setItem(key, value) { values.set(key, value); },
        },
    };
    if (request === './supabase') return { supabase: { auth: { async getSession() {
                    return { data: { session: user ? { user: { id: user }, access_token: 'fake' } : null }, error: null };
                } } } };
    if (request === 'react') return { useSyncExternalStore() { throw new Error('No hooks in these service tests'); } };
    return originalLoad.call(this, request, parent, ...rest);
};
global.fetch = async () => { throw new Error('Sample mode must not use the network'); };
const mode = require(path.join(root, 'services/dataMode.js'));
const api = require(path.join(root, 'services/healthcare.js'));
const { accountStorage } = require(path.join(root, 'services/accountStorage.js'));
test('sample services work offline, isolate accounts, and reject API edits', async () => {
    mode.selectDataMode('sample');
    for (const section of ['profile','vitals','medications','providers','appointments','insurance','test-results','messages']) {
        assert.ok((await api.loadSection(section)).items.length > 0, section);
    }
    const id = await api.saveSampleAppointment({ provider:'Fictional Test Provider', reason:'Test visit', date:'2099-12-01', time:'10:30', notes:'test', type:'In-Person' });
    assert.ok((await api.loadSection('appointments')).items.some(x => x.id === id));
    await api.cancelSampleAppointment(id);
    assert.equal((await api.loadSection('appointments')).items.find(x => x.id === id).status, 'cancelled');
    await api.sendSampleMessage('A fictional saved message');
    assert.equal((await api.loadSection('messages')).items.length, 2);
    user = 'bob';
    assert.equal((await api.loadSection('messages')).items.length, 1, 'Bob must not see Alice messages');
    assert.ok(!(await api.loadSection('appointments')).items.some(x => x.id === id), 'Bob must not see Alice bookings');
    user = 'alice';
    assert.equal((await api.loadSection('messages')).items.length, 2, 'Alice local data must persist across sign-in');
    const storage = await accountStorage('guard');
    user = 'bob';
    await assert.rejects(() => storage.setItem('example','nope'), /account or data mode changed/);
    mode.selectDataMode('api');
    await assert.rejects(() => api.sendSampleMessage('not allowed'), /Sample Data Mode/);
    mode.selectDataMode('sample'); user = null;
    await assert.rejects(() => api.sendSampleMessage('not allowed'), /Sign in/);
});