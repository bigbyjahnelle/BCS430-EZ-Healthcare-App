// No network access: mocks Supabase Auth/PostgREST and Epic's token endpoint.
// Run: npx --yes deno test --allow-env --allow-read tests/edge.test.ts
type Value = Record<string, unknown>;
let serve: ((req: Request) => Promise<Response>) | undefined;
const owner = '11111111-1111-4111-8111-111111111111';
let attempt: Value | null = null, connection: Value | null = null;
const response = (v: unknown, status = 200) => new Response(v === null ? null : JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } });
function assert(condition: unknown, message: string) { if (!condition) throw new Error(message); }
Deno.env.set('SUPABASE_URL', 'https://example.test');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-not-a-real-key');
Deno.env.set('EPIC_CLIENT_ID', 'test-client');
Deno.env.set('EPIC_TOKEN_ENCRYPTION_KEY', '42'.repeat(32));
Object.defineProperty(Deno, 'serve', { configurable: true, value: (handler: (req: Request) => Promise<Response>) => { serve = handler; return {}; } });
globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init), url = new URL(req.url);
    if (url.pathname === '/auth/v1/user') {
        if (!['Bearer alice', 'Bearer bob'].includes(req.headers.get('Authorization') ?? '')) return response({ msg: 'Invalid JWT' }, 401);
        return response({ id: req.headers.get('Authorization') === 'Bearer alice' ? owner : '22222222-2222-4222-8222-222222222222', aud: 'authenticated', email: 'example@example.test' });
    }
    if (url.pathname.endsWith('/rpc/ez_epic_allow_request')) return response(true);
    if (url.pathname.endsWith('/ez_epic_attempts')) {
        if (req.method === 'HEAD') return new Response(null, { headers: { 'content-range': '0-0/0' } });
        if (req.method === 'POST') {
            attempt = { ...await req.json(), id: '33333333-3333-4333-8333-333333333333', status: 'pending', expires_at: new Date(Date.now() + 600000).toISOString() };
            return response({ id: attempt!.id });
        }
        if (req.method === 'DELETE') {
            if (!url.searchParams.has('expires_at')) attempt = null;
            return new Response(null, { status: 204 });
        }
        if (req.method === 'PATCH') { if (attempt) Object.assign(attempt, await req.json()); return new Response(null, {status:204}); }
        const match = attempt && url.searchParams.get('user_id') === `eq.${attempt.user_id}`;
        return response(match ? { status: attempt!.status, expires_at: attempt!.expires_at } : null);
    }
    if (url.pathname.endsWith('/rpc/ez_consume_epic_attempt')) {
        const { p_hash } = await req.json();
        if (attempt?.state_hash !== p_hash || attempt?.status !== 'pending') return response([]);
        attempt.status = 'exchanging'; return response([attempt]);
    }
    if (url.pathname.endsWith('/rpc/ez_complete_epic_attempt')) {
        const p = await req.json();
        if (!attempt || attempt.id !== p.p_id || attempt.status !== 'exchanging') return response(false);
        connection = { user_id: owner, patient_id: p.p_patient, access_encrypted: p.p_access, scopes: p.p_scopes, expires_at: p.p_expires };
        attempt.status = 'complete'; attempt.verifier_encrypted = ''; return response(true);
    }
    if (url.pathname.endsWith('/ez_epic_connections')) {
        if (req.method === 'DELETE') { if (!url.searchParams.has('expires_at')) connection = null; return new Response(null, {status:204}); }
        return response(connection && url.searchParams.get('user_id') === `eq.${connection.user_id}` ? connection : null);
    }
    if (url.hostname === 'fhir.epic.com' && url.pathname.endsWith('/oauth2/token')) {
        const body = new URLSearchParams(await req.text());
        assert(body.get('redirect_uri') === 'https://example.test/functions/v1/healthcare/callback', 'callback must match');
        assert(body.get('code_verifier')?.length === 43, 'PKCE verifier missing');
        return response({ access_token: 'mock-epic-access-token', token_type: 'Bearer', patient: 'sandbox-patient', expires_in: 3600, scope: 'patient/Patient.read' });
    }
    if (url.hostname === 'fhir.epic.com' && url.pathname.endsWith('/Patient/sandbox-patient')) {
        assert(req.headers.get('Authorization') === 'Bearer mock-epic-access-token', 'server must decrypt token for upstream call');
        return response({ resourceType: 'Patient', id: 'sandbox-patient', name: [{text:'Synthetic Patient'}] });
    }
    throw new Error(`Unexpected mocked request: ${req.method} ${url.origin}${url.pathname}`);
};
await import('../supabase/functions/healthcare/index.ts');
function call(path: string, method = 'GET', auth?: string) {
    return serve!(new Request(`https://example.test/functions/v1/healthcare/${path}`, { method, headers: auth ? {Authorization:`Bearer ${auth}`} : {} }));
}
Deno.test('hosted OAuth and record access remain account-bound with one-time state', async () => {
    assert((await call('records/profile')).status === 401, 'anonymous records must fail');
    assert((await call('connection', 'GET', 'bad-token')).status === 401, 'invalid JWT must fail');
    assert((await call('callback?state=invalid')).status === 400, 'invalid callback state must fail');
    const started = await (await call('start','POST','alice')).json();
    const login = new URL(started.loginUrl), state = login.searchParams.get('state')!;
    assert(login.searchParams.get('code_challenge_method') === 'S256', 'PKCE must use S256');
    assert(attempt?.verifier_encrypted && !String(attempt.verifier_encrypted).includes(login.searchParams.get('code_challenge')!), 'verifier must be encrypted');
    const completed = await call(`callback?state=${encodeURIComponent(state)}&code=mock-code`);
    assert(completed.status === 302, 'callback must redirect');
    assert(completed.headers.get('Location')?.startsWith('ezhealthcare://connect-epic'), 'callback must return to central connection route');
    assert(!completed.headers.get('Location')?.includes('mock-epic-access-token'), 'deep link must not contain tokens');
    assert(connection?.access_encrypted && !String(connection.access_encrypted).includes('mock-epic-access-token'), 'database token must be encrypted');
    assert((await call(`callback?state=${encodeURIComponent(state)}&code=mock-code`)).status === 400, 'state replay must fail');
    const patient = await (await call('records/profile','GET','alice')).json();
    assert(patient.resource.id === 'sandbox-patient', 'owner should get own connected patient');
    assert((await call('records/profile','GET','bob')).status === 409, 'other account must not use owner connection');
    assert((await call('records/messages','GET','alice')).status === 501, 'unsupported MyChart messaging must be explicit');
    assert((await call('connection','DELETE','alice')).status === 200, 'disconnect must succeed');
    assert((await call('records/profile','GET','alice')).status === 409, 'disconnected token must not be usable');
});