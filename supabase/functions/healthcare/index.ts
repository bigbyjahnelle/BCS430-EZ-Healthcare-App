import { createClient } from 'npm:@supabase/supabase-js@2.119.2';
import { arr, obj, str, bundleResources, checkPatient } from '../_shared/fhir.ts';
import type { Fhir, Section } from '../_shared/fhir.ts';

// Synthetic Epic sandbox only. Do not use this demo for real patient records.
const BASE = 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';
const AUTHORIZE = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize';
const TOKEN = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token';
const RETURN = 'ezhealthcare://connect-epic';
const responseHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
class RequestError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: responseHeaders });
function required(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new RequestError(503, 'configuration', 'Hosted backend setup is incomplete.');
  return v;
}
function admin() {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
const enc = new TextEncoder();
function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unbase64url(s: string) {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b.padEnd(Math.ceil(b.length / 4) * 4, '=')), c => c.charCodeAt(0));
}
function random() { return base64url(crypto.getRandomValues(new Uint8Array(32))); }
async function hash(s: string) { return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))); }
async function key() {
  const hex = required('EPIC_TOKEN_ENCRYPTION_KEY');
  if (!/^[a-fA-F0-9]{64}$/.test(hex)) throw new RequestError(503, 'configuration', 'Backend encryption is not configured.');
  return crypto.subtle.importKey('raw', Uint8Array.from(hex.match(/../g)!, n => parseInt(n, 16)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function encrypt(s: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), enc.encode(s));
  return `${base64url(iv)}.${base64url(new Uint8Array(bytes))}`;
}
async function decrypt(s: string) {
  const [iv, bytes] = s.split('.');
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unbase64url(iv) }, await key(), unbase64url(bytes)));
}
function checked<T>(data: T, error: unknown): T {
  if (error) throw new RequestError(503, 'storage', 'Hosted storage is unavailable. Try again later.');
  return data;
}
function callbackUrl() { return `${required('SUPABASE_URL').replace(/\/$/, '')}/functions/v1/healthcare/callback`; }
function scopes() {
  return ['launch/patient', 'patient/Patient.read', 'patient/MedicationRequest.read', 'patient/Medication.read',
    'patient/Observation.read', 'patient/Appointment.read', 'patient/Coverage.read',
    ...(Deno.env.get('EPIC_EXTRA_SCOPES') ?? '').split(/\s+/).filter(Boolean)].join(' ');
}
function redirect(attempt: string, result: string) {
  const url = new URL(RETURN); url.searchParams.set('attempt', attempt); url.searchParams.set('result', result);
  // No HTML dependency or token in this deep link. The app verifies via Auth.
  return new Response(null, { status: 302, headers: { Location: url.toString(), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
async function callback(req: Request, db: ReturnType<typeof admin>) {
  const url = new URL(req.url), state = url.searchParams.get('state') ?? '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(state)) return json({ error: 'Invalid sign-in. Return to the app and reconnect.' }, 400);
  const consumed = await db.rpc('ez_consume_epic_attempt', { p_hash: await hash(state) });
  const attempt = obj(arr(checked(consumed.data, consumed.error))[0]);
  if (!attempt.id) return json({ error: 'This sign-in is expired or already used. Return to the app.' }, 400);
  try {
    const code = url.searchParams.get('code');
    if (url.searchParams.has('error') || !code || code.length > 8192) throw new Error('Authorization not completed');
    const response = await fetch(TOKEN, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: required('EPIC_CLIENT_ID'),
        redirect_uri: callbackUrl(), code, code_verifier: await decrypt(str(attempt.verifier_encrypted)) }) });
    if (!response.ok) {
      console.error('Epic token exchange HTTP status:', response.status);
      throw new Error('Token exchange failed');
    }
    const token = obj(await response.json());
    const seconds = typeof token.expires_in === 'number' ? token.expires_in : Number(token.expires_in);
    if (!str(token.access_token) || !/^[A-Za-z0-9.-]{1,200}$/.test(str(token.patient)) ||
        !Number.isFinite(seconds) || seconds <= 10 || str(token.token_type).toLowerCase() !== 'bearer') throw new Error('Unexpected token response');
    const saved = await db.rpc('ez_complete_epic_attempt', { p_id: attempt.id, p_patient: token.patient,
      p_access: await encrypt(str(token.access_token)), p_scopes: str(token.scope),
      p_expires: new Date(Date.now() + Math.min(seconds, 3600) * 1000 - 10000).toISOString() });
    if (!checked(saved.data, saved.error)) throw new Error('Sign-in cancelled');
    return redirect(str(attempt.id), 'connected');
  } catch {
    await db.from('ez_epic_attempts').update({ status: 'failed', verifier_encrypted: '' }).eq('id', attempt.id).eq('status', 'exchanging');
    return redirect(str(attempt.id), 'failed');
  }
}
async function fhir(path: string, token: string): Promise<Fhir> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/fhir+json' },
      redirect: 'error', signal: AbortSignal.timeout(20000) });
  } catch { throw new RequestError(504, 'upstream_timeout', 'Epic could not be reached in time. This does not mean no records exist. Try again later.'); }
  if (response.status === 401) throw new RequestError(409, 'epic_connection_required', 'Your Epic authorization expired. Reconnect to Epic.');
  if (response.status === 403) throw new RequestError(403, 'epic_permission', 'Epic denied access. Check the registered API and granted permissions, then reconnect.');
  if (response.status === 429) throw new RequestError(429, 'epic_rate_limit', 'Epic is limiting requests. Wait before trying again.');
  if (!response.ok) throw new RequestError(502, 'epic_error', `Epic returned HTTP ${response.status}. No sample data was substituted.`);
  return obj(await response.json());
}
async function providers(token: string, patientId: string) {
  const meds = await fhir(`MedicationRequest?patient=${encodeURIComponent(patientId)}`, token);
  const { resources, warnings } = bundleResources(meds), refs = new Map<string, string>();
  for (const r of resources) if (r.resourceType === 'MedicationRequest') {
    checkPatient(r, 'medications', patientId, BASE);
    const requester = obj(r.requester), ref = str(requester.reference);
    const relative = ref.startsWith(`${BASE}/`) ? ref.slice(BASE.length + 1) : ref;
    if (/^Practitioner\/[A-Za-z0-9.-]+$/.test(relative)) refs.set(relative, str(requester.display));
  }
  const entries: Fhir[] = [];
  // Bounded parallel lookups; permission failures do not invent provider names.
  await Promise.all([...refs].slice(0, 8).map(async ([ref, display]) => {
    try {
      const p = await fhir(ref, token);
      if (p.resourceType !== 'Practitioner' || p.id !== ref.split('/')[1]) throw new Error('Unexpected provider');
      entries.push(p);
    } catch {
      entries.push({ resourceType: 'Practitioner', id: ref.split('/')[1], ...(display ? { name: [{ text: display }] } : {}) });
      warnings.push('Some provider details were unavailable or not authorized. Names are shown only when supplied by the source.');
    }
  }));
  warnings.push('These are prescribing providers linked to medication orders, not a complete care team or directory.');
  if (refs.size > 8) warnings.push('Only the first eight linked providers are included.');
  return { resource: { resourceType: 'Bundle', type: 'searchset', entry: entries.map(resource => ({ resource })) }, warnings };
}

Deno.serve(async req => {
  try {
    const db = admin();
    const path = new URL(req.url).pathname.replace(/^.*\/healthcare\/?/, '').replace(/\/$/, '');
    if (path === 'callback' && req.method === 'GET') return await callback(req, db);
    // Only callback is public, with single-use state and PKCE protections.
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) throw new RequestError(401, 'login_required', 'Sign in to EZ Healthcare first.');
    const verified = await db.auth.getUser(auth.slice(7)), user = verified.data.user;
    if (verified.error || !user) throw new RequestError(401, 'login_required', 'Your EZ Healthcare session expired. Sign in again.');
    const allowed = await db.rpc('ez_epic_allow_request', { p_user: user.id });
    if (!checked(allowed.data, allowed.error)) throw new RequestError(429, 'rate_limit', 'Too many requests. Wait one minute.');
    if (path === 'start' && req.method === 'POST') {
      const cleanup = await db.from('ez_epic_attempts').delete().lt('expires_at', new Date().toISOString());
      checked(cleanup.data, cleanup.error);
      // Purge expired encrypted tokens during new sign-ins.
      const old = await db.from('ez_epic_connections').delete().lt('expires_at', new Date().toISOString());
      checked(old.data, old.error);
      const count = await db.from('ez_epic_attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      checked(count.data, count.error);
      if ((count.count ?? 0) >= 5) throw new RequestError(429, 'login_rate_limit', 'Wait ten minutes before starting another Epic sign-in.');
      const state = random(), verifier = random();
      const insert = await db.from('ez_epic_attempts').insert({ user_id: user.id, state_hash: await hash(state), verifier_encrypted: await encrypt(verifier) }).select('id').single();
      const attempt = checked(insert.data, insert.error);
      const url = new URL(AUTHORIZE);
      url.search = new URLSearchParams({ response_type: 'code', client_id: required('EPIC_CLIENT_ID'), redirect_uri: callbackUrl(),
        aud: BASE, scope: scopes(), state, code_challenge_method: 'S256', code_challenge: await hash(verifier) }).toString();
      return json({ id: attempt!.id, loginUrl: url.toString() });
    }
    if (path === 'connection' && req.method === 'GET') {
      const c = await db.from('ez_epic_connections').select('expires_at, connected_at').eq('user_id', user.id).maybeSingle();
      const connection = checked(c.data, c.error);
      return json({ connected: Boolean(connection && Date.parse(connection.expires_at) > Date.now()), expiresAt: connection?.expires_at ?? null });
    }
    if (path.startsWith('attempt/') && req.method === 'GET') {
      const id = path.slice(8);
      if (!/^[a-f0-9-]{36}$/.test(id)) throw new RequestError(400, 'invalid_attempt', 'Invalid sign-in attempt.');
      const found = await db.from('ez_epic_attempts').select('status, expires_at').eq('user_id', user.id).eq('id', id).maybeSingle();
      const a = checked(found.data, found.error);
      return json({ status: a && Date.parse(a.expires_at) > Date.now() ? a.status : 'expired' });
    }
    if (path === 'connection' && req.method === 'DELETE') {
      // Delete attempts FIRST to serialize against a callback finishing its transaction.
      for (const table of ['ez_epic_attempts', 'ez_epic_connections']) {
        const deleted = await db.from(table).delete().eq('user_id', user.id); checked(deleted.data, deleted.error);
      }
      return json({ disconnected: true });
    }
    if (path.startsWith('records/') && req.method === 'GET') {
      const section = path.slice(8) as Section;
      if (section === 'messages') throw new RequestError(501, 'unsupported', 'A MyChart inbox/send integration is not configured. Epic Communication APIs are workflow-specific, not a generic patient inbox. Use Sample Data Mode for simulated conversations.');
      if (!['profile', 'vitals', 'medications', 'providers', 'appointments', 'insurance', 'test-results'].includes(section)) throw new RequestError(404, 'unknown_section', 'Unknown record section.');
      const c = await db.from('ez_epic_connections').select('*').eq('user_id', user.id).maybeSingle();
      const connection = checked(c.data, c.error);
      if (!connection || Date.parse(connection.expires_at) <= Date.now()) throw new RequestError(409, 'epic_connection_required', 'Connect to Epic to view this section.');
      const token = await decrypt(connection.access_encrypted), pid = connection.patient_id;
      const paths: Record<string, string> = { profile: `Patient/${encodeURIComponent(pid)}`, medications: `MedicationRequest?patient=${encodeURIComponent(pid)}`,
        appointments: `Appointment?patient=${encodeURIComponent(pid)}`, insurance: `Coverage?patient=${encodeURIComponent(pid)}`,
        vitals: `Observation?patient=${encodeURIComponent(pid)}&category=vital-signs`, 'test-results': `Observation?patient=${encodeURIComponent(pid)}&category=laboratory` };
      const result = section === 'providers' ? await providers(token, pid) : { resource: await fhir(paths[section], token), warnings: [] };
      return json({ ...result, patientId: pid, fhirBase: BASE, source: 'Epic sandbox — synthetic patient records', fetchedAt: new Date().toISOString() });
    }
    throw new RequestError(404, 'not_found', 'Endpoint not found or HTTP method not supported.');
  } catch (error) {
    if (error instanceof RequestError) return json({ error: error.message, code: error.code }, error.status);
    console.error('Healthcare request failed:', error instanceof Error ? error.name : 'UnknownError');
    return json({ error: 'The hosted request could not be completed. Check the function configuration and logs.', code: 'backend_error' }, 500);
  }
});