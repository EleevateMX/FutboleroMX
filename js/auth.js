// ── Supabase Auth ──────────────────────────────────────────────────────────────
// Las keys se llenan automáticamente cuando el proyecto FutboleroMX esté creado
const SUPA_URL  = 'https://sclqzavebwinezpivmwr.supabase.co';
const SUPA_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbHF6YXZlYndpbmV6cGl2bXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NDMzNjUsImV4cCI6MjA5NzIxOTM2NX0.khNF90QxEqh1jEOxdtseREfWLmGAW-3cVJpots4VbTc';

const { createClient } = supabase;
const sb = createClient(SUPA_URL, SUPA_KEY);

// Estado en memoria del usuario activo
let _user  = null;   // { id, email, name, pts }
let _picks = {};     // { matchId: 'home'|'draw'|'away' }

// ── Inicialización ─────────────────────────────────────────────────────────────
async function authInit() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await _loadProfile(session.user);

  sb.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      await _loadProfile(session.user);
    } else {
      _user  = null;
      _picks = {};
    }
    _updateNavUI();
    if (typeof renderQuinielaSection === 'function') renderQuinielaSection();
  });
}

async function _loadProfile(supaUser) {
  const { data } = await sb
    .from('profiles')
    .select('name, pts, picks')
    .eq('id', supaUser.id)
    .single();

  _user  = {
    id:    supaUser.id,
    email: supaUser.email,
    name:  data?.name  ?? supaUser.email.split('@')[0],
    pts:   data?.pts   ?? 0,
  };
  _picks = data?.picks ?? {};
}

// ── API pública ────────────────────────────────────────────────────────────────
const Auth = {
  // Usuario activo (síncrono, post-init)
  getUser: () => _user,

  // Registro
  async register(name, email, password) {
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { name } },
    });
    if (error) return { ok: false, msg: _esError(error) };

    // Crear perfil en tabla pública
    await sb.from('profiles').insert({
      id:    data.user.id,
      name,
      pts:   0,
      picks: {},
    });
    return { ok: true };
  },

  // Login
  async login(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, msg: _esError(error) };
    return { ok: true };
  },

  // Logout
  async logout() {
    await sb.auth.signOut();
  },

  // Guardar pick de quiniela
  async savePick(matchId, pick) {
    if (!_user) return;
    _picks[matchId] = pick;
    await sb.from('profiles').update({ picks: _picks }).eq('id', _user.id);
  },

  getPick: (matchId) => _picks[matchId] ?? null,

  isLoggedIn: () => !!_user,
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function _esError(error) {
  const map = {
    'Invalid login credentials':                'Correo o contraseña incorrectos.',
    'User already registered':                  'Este correo ya tiene una cuenta.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Email not confirmed':                      'Revisa tu correo y confirma tu cuenta.',
    'signup_disabled':                          'El registro está temporalmente desactivado.',
  };
  for (const [key, msg] of Object.entries(map)) {
    if (error.message?.includes(key)) return msg;
  }
  return error.message ?? 'Ocurrió un error. Intenta de nuevo.';
}

function _updateNavUI() {
  const guest   = document.getElementById('nav-guest');
  const userDiv = document.getElementById('nav-user');
  const avatar  = document.getElementById('nav-avatar');
  const uname   = document.getElementById('nav-username');
  if (!guest) return;
  if (_user) {
    guest.style.display   = 'none';
    userDiv.style.display = 'flex';
    avatar.textContent    = (_user.name || '?').slice(0, 2).toUpperCase();
    uname.textContent     = _user.name;
  } else {
    guest.style.display   = 'flex';
    userDiv.style.display = 'none';
  }
}
