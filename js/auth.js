// ── TVContigo — Supabase Auth ─────────────────────────────────────────────
const SUPA_URL = 'https://auth.tvcontigo.site';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbHF6YXZlYndpbmV6cGl2bXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NDMzNjUsImV4cCI6MjA5NzIxOTM2NX0.khNF90QxEqh1jEOxdtseREfWLmGAW-3cVJpots4VbTc';

const { createClient } = supabase;
const sb = createClient(SUPA_URL, SUPA_KEY);

let _user  = null;
let _picks = {};

// ── Analítica de tráfico (anónima) ──────────────────────────────────────────
function _visitorId() {
  let v = localStorage.getItem('tvc_vid');
  if (!v) { v = 'v' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('tvc_vid', v); }
  return v;
}
function trackEvent(kind, label) {
  // OJO: en supabase-js la petición solo se manda con .then()/await
  try {
    sb.from('traffic').insert({ kind, label: label || null, visitor: _visitorId() }).then(() => {}, () => {});
  } catch (e) {}
}

async function authInit() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await _loadProfile(session.user);
  updateNav();

  sb.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      await _loadProfile(session.user);
    } else {
      _user  = null;
      _picks = {};
    }
    updateNav();
    if (typeof renderQuinielaSection === 'function') renderQuinielaSection();
  });
}

async function _loadProfile(supaUser) {
  const { data } = await sb
    .from('profiles')
    .select('name, pts, picks, avatar_url')
    .eq('id', supaUser.id)
    .single();

  const googleAvatar = supaUser.user_metadata?.avatar_url || supaUser.user_metadata?.picture || null;
  const googleName = supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || null;

  if (!data) {
    const name = googleName || supaUser.email.split('@')[0];
    await sb.from('profiles').insert({ id: supaUser.id, name, pts: 0, picks: {}, avatar_url: googleAvatar });
    _user  = { id: supaUser.id, email: supaUser.email, name, pts: 0, avatar: googleAvatar, googleName };
    _picks = {};
    return;
  }

  _user  = { id: supaUser.id, email: supaUser.email, name: data.name, pts: data.pts, avatar: data.avatar_url || googleAvatar, googleName };
  _picks = data.picks ?? {};
}

const Auth = {
  getUser:    () => _user,
  isLoggedIn: () => !!_user,
  getPick:    (matchId) => _picks[matchId] ?? null,

  async register(name, email, password) {
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { name } },
    });
    if (error) return { ok: false, msg: _esError(error) };
    if (data.user) {
      await sb.from('profiles').insert({ id: data.user.id, name, pts: 0, picks: {} });
    }
    return { ok: true };
  },

  async login(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, msg: _esError(error) };
    return { ok: true };
  },

  async logout() {
    await sb.auth.signOut();
  },

  async savePick(matchId, pick) {
    if (!_user) return;
    _picks[matchId] = pick;
    await sb.from('profiles').update({ picks: _picks }).eq('id', _user.id);
  },

  async updateName(name) {
    if (!_user || !name.trim()) return { ok: false, msg: 'Nombre inválido' };
    const { error } = await sb.from('profiles').update({ name: name.trim() }).eq('id', _user.id);
    if (error) return { ok: false, msg: error.message };
    _user.name = name.trim();
    updateNav();
    return { ok: true };
  },

  async uploadAvatar(file) {
    if (!_user) return { ok: false, msg: 'No has iniciado sesión' };
    if (!file.type.startsWith('image/')) return { ok: false, msg: 'Selecciona una imagen' };
    if (file.size > 3 * 1024 * 1024) return { ok: false, msg: 'La imagen debe pesar menos de 3 MB' };

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${_user.id}/avatar.${ext}`;
    const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' });
    if (upErr) return { ok: false, msg: upErr.message };

    const { data: pub } = sb.storage.from('avatars').getPublicUrl(path);
    const url = pub.publicUrl + '?t=' + Date.now();
    const { error } = await sb.from('profiles').update({ avatar_url: url }).eq('id', _user.id);
    if (error) return { ok: false, msg: error.message };
    _user.avatar = url;
    updateNav();
    return { ok: true, url };
  },
};

async function signInWithGoogle() {
  closeAll();
  // URL limpia del directorio actual (sin index.html / query / hash)
  const base = window.location.pathname.replace(/index\.html$/, '');
  const redirectTo = window.location.origin + base;
  await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
}

function updateNav() {
  const guestEl  = document.getElementById('nav-guest');
  const userEl   = document.getElementById('nav-user');
  const avatarEl = document.getElementById('nav-avatar');
  const nameEl   = document.getElementById('nav-username');
  if (!guestEl) return;

  if (_user) {
    guestEl.style.display = 'none';
    userEl.classList.add('visible');
    if (_user.avatar) {
      avatarEl.style.backgroundImage = `url('${_user.avatar}')`;
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
      avatarEl.textContent = '';
    } else {
      avatarEl.style.backgroundImage = '';
      avatarEl.textContent = (_user.name || '?').slice(0, 2).toUpperCase();
    }
    avatarEl.style.cursor = 'pointer';
    avatarEl.onclick = () => { location.href = 'perfil.html'; };
    nameEl.textContent = _user.name;
  } else {
    guestEl.style.display = 'flex';
    userEl.classList.remove('visible');
  }
}

function _esError(error) {
  const map = {
    'Invalid login credentials':                'Correo o contraseña incorrectos.',
    'User already registered':                  'Este correo ya tiene una cuenta.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Email not confirmed':                      'Revisa tu correo y confirma tu cuenta.',
    'signup_disabled':                          'El registro está temporalmente desactivado.',
    'over_email_send_rate_limit':               'Demasiados intentos. Espera un momento.',
  };
  for (const [key, msg] of Object.entries(map)) {
    if (error.message?.includes(key)) return msg;
  }
  return error.message ?? 'Ocurrió un error. Intenta de nuevo.';
}
