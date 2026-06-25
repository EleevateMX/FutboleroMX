// ── TVContigo — Mi Perfil ─────────────────────────────────────────────────
// Perfil conectado a la quiniela por partido: datos, avatar, selección,
// pronósticos, insignias e idioma. Auth/foto/referidos = Supabase; el resto
// (username, emoji, selección, idioma, actividad) = localStorage (listo para
// backend). Recreativo, sin valor monetario.

// Banderas y lista de selecciones derivadas de los partidos reales (data.js)
const _FLAGS = (() => {
  const m = new Map();
  (typeof MATCHES !== 'undefined' ? MATCHES : []).forEach(x => {
    m.set(x.home.name, x.home.flag); m.set(x.away.name, x.away.flag);
  });
  return m;
})();
function flagOf(name) { return _FLAGS.get(name) || '🏳️'; }
const ALL_TEAMS = (() => {
  const seen = new Set(); const out = [];
  (typeof MATCHES !== 'undefined' ? MATCHES : []).forEach(x => {
    [x.home, x.away].forEach(t => { if (!seen.has(t.name)) { seen.add(t.name); out.push({ name: t.name, flag: t.flag }); } });
  });
  return out.sort((a, b) => a.name.localeCompare(b.name, 'es'));
})();

const AVATAR_EMOJIS = ['🦅','🐐','🦁','🔥','⚡','🧤','🌮','🏆','🎯','🐺','🐆','⭐'];

let _tab = 'perfil';
let _refCode = '';

// ── Estado local (localStorage) ───────────────────────────────────────────
function _read(k, def) { try { return JSON.parse(localStorage.getItem(k) || def); } catch (e) { return JSON.parse(def); } }
function _localPrefs() { return _read('tvc_profile', '{}'); }
function _saveLocal(patch) { const p = _localPrefs(); Object.assign(p, patch); localStorage.setItem('tvc_profile', JSON.stringify(p)); }
function _pointsObj() { return _read('tvc_points', '{}'); }
function _predictions() { return _read('tvc_predictions', '{}'); }
function _activity() { return _read('tvc_activity', '[]'); }
function logActivity(type, label) {
  const a = _activity();
  a.unshift({ id: 'act-' + a.length, type, label, at: new Date().toISOString() });
  localStorage.setItem('tvc_activity', JSON.stringify(a.slice(0, 40)));
}

// Perfil combinado (Auth + local + puntos)
function getProfile() {
  const u = (typeof Auth !== 'undefined' && Auth.getUser && Auth.getUser()) || {};
  const p = _localPrefs();
  const pts = _pointsObj();
  const lvl = (typeof levelFor === 'function') ? levelFor(pts.total || 0) : { name: 'Aficionado', min: 0, max: 99 };
  const baseName = u.name || p.name || 'Aficionado';
  return {
    loggedIn: !!(u && u.id),
    id: u.id || null, name: baseName, email: u.email || '',
    photo: u.avatar || '',                                  // foto subida (Supabase)
    emoji: p.emoji || '🦅',
    username: p.username || _slug(baseName),
    favoriteTeam: p.favoriteTeam || '', favoriteFlag: p.favoriteTeam ? flagOf(p.favoriteTeam) : '',
    language: p.language || 'es',
    champion: p.champion || null, topScorer: p.topScorer || null,
    points: pts.total || 0, todayPoints: pts.today || 0, streak: pts.streak || 0,
    level: lvl, googleName: u.googleName || '',
  };
}
function _slug(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9._-]/g, '').slice(0, 20) || 'jugador'; }

// ── Pronósticos por partido (helpers locales) ─────────────────────────────
function predStatus(m) {
  if (m.status === 'finished') return 'finished';
  if (new Date(m.kickoff).getTime() <= Date.now()) return 'locked';
  return 'open';
}
function predPoints(pred, m) {
  if (m.hs == null || m.as == null) return 0;
  const S = (typeof PREDICTION_SCORING !== 'undefined') ? PREDICTION_SCORING : { participation: 5, correctWinner: 10, correctGoalDiff: 15, exactScore: 30 };
  let pts = S.participation;
  const rw = m.hs > m.as ? 'h' : m.hs < m.as ? 'a' : 'd';
  const pw = pred.hs > pred.as_ ? 'h' : pred.hs < pred.as_ ? 'a' : 'd';
  if (pw === rw) pts += S.correctWinner;
  if (rw !== 'd' && pw === rw && (pred.hs - pred.as_) === (m.hs - m.as)) pts += S.correctGoalDiff;
  if (pred.hs === m.hs && pred.as_ === m.as) pts += S.exactScore;
  return pts;
}
function myPredictions() {
  const all = _predictions();
  return Object.values(all)
    .map(p => ({ p, m: (typeof MATCHES !== 'undefined' ? MATCHES : []).find(x => x.id === p.matchId) }))
    .filter(x => x.m)
    .sort((a, b) => new Date(b.m.kickoff) - new Date(a.m.kickoff));
}

// ── Insignias (6 · TVContigo) ─────────────────────────────────────────────
function computeBadges() {
  const mine = myPredictions();
  const fin = mine.filter(x => x.m.status === 'finished' && x.m.hs != null);
  let exact = 0, winners = 0;
  fin.forEach(({ p, m }) => {
    if (p.hs === m.hs && p.as_ === m.as) exact++;
    const rw = m.hs > m.as ? 'h' : m.hs < m.as ? 'a' : 'd', pw = p.hs > p.as_ ? 'h' : p.hs < p.as_ ? 'a' : 'd';
    if (rw === pw) winners++;
  });
  const pts = _pointsObj();
  return [
    { id: 'exacto',     name: 'El Exacto',       icon: '🎯', desc: 'Acertaste un marcador exacto.',        on: exact >= 1 },
    { id: 'racha',      name: 'Racha Activa',    icon: '🔥', desc: 'Pronosticaste varios días seguidos.',  on: (pts.streak || 0) >= 3 },
    { id: 'analista',   name: 'El Analista',     icon: '📊', desc: 'Acertaste varios ganadores.',          on: winners >= 3 },
    { id: 'madrugador', name: 'Madrugador',      icon: '🌅', desc: 'Pronosticaste antes que la mayoría.',  on: mine.length >= 1 },
    { id: 'contra',     name: 'Contra Corriente',icon: '🎲', desc: 'Acertaste un resultado poco elegido.', on: exact >= 2 },
    { id: 'top',        name: 'Top Predictor',   icon: '🏆', desc: 'Entraste al top del ranking diario.',  on: (pts.total || 0) >= 100 },
  ];
}

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof authInit === 'function') { try { await authInit(); } catch (e) {} }
  // Refer code (si hay sesión)
  try {
    const u = Auth.getUser && Auth.getUser();
    if (u && u.id) {
      const { data } = await sb.from('profiles').select('referral_code').eq('id', u.id).single();
      _refCode = (data && data.referral_code) || '';
    }
  } catch (e) {}
  const inp = document.getElementById('avatar-input');
  if (inp) inp.addEventListener('change', onAvatarPicked);
  render();
});

// ── Render principal ──────────────────────────────────────────────────────
function render() {
  const el = document.getElementById('p-content');
  if (!el) return;
  el.innerHTML = `
    <h1 class="profile-title">TU PERFIL</h1>
    <div class="profile-tabs">
      <button class="ptab${_tab === 'perfil' ? ' active' : ''}" onclick="setTab('perfil')">Perfil</button>
      <button class="ptab${_tab === 'predic' ? ' active' : ''}" onclick="setTab('predic')">Mis pronósticos</button>
      <button class="ptab${_tab === 'activ' ? ' active' : ''}" onclick="setTab('activ')">Actividad</button>
    </div>
    ${renderProfileCard()}
    <div id="ptab-body">${_tab === 'perfil' ? renderPerfilTab() : _tab === 'predic' ? renderPredictionsTab() : renderActivityTab()}</div>`;
}
function setTab(t) { _tab = t; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function renderProfileCard() {
  const u = getProfile();
  const lvl = u.level;
  const next = (typeof REWARD_LEVELS !== 'undefined') ? REWARD_LEVELS.find(l => l.min > (lvl.max || 0)) : null;
  const span = (lvl.max === Infinity || !next) ? 1 : (lvl.max - lvl.min + 1);
  const into = (lvl.max === Infinity) ? 1 : (u.points - lvl.min);
  const pct = Math.max(4, Math.min(100, Math.round(into / span * 100)));
  const avatarInner = u.photo ? '' : (u.emoji || (u.name || '?').slice(0, 2).toUpperCase());
  const avatarStyle = u.photo ? `background-image:url('${u.photo}')` : '';
  return `
    <div class="profile-card">
      <div class="pc-top">
        <div class="pc-avatar" style="${avatarStyle}" onclick="document.getElementById('avatar-input').click()">
          ${avatarInner}<div class="pc-avatar-edit">✎</div>
        </div>
        <div class="pc-meta">
          <div class="pc-name">${esc(u.name)}</div>
          ${u.email ? `<div class="pc-email">${esc(u.email)}</div>` : ''}
          <div class="pc-handle">@${esc(u.username)}</div>
          ${u.favoriteTeam ? `<div class="pc-fav">${u.favoriteFlag} ${esc(u.favoriteTeam)}</div>` : '<div class="pc-fav pc-fav-none">Sin selección favorita</div>'}
        </div>
        <div class="pc-points">
          <div class="pc-points-val">${u.points}</div>
          <div class="pc-points-lbl">PUNTOS</div>
        </div>
      </div>
      <div class="pc-level">
        <div class="pc-level-top"><span>Nivel: <strong>${lvl.name}</strong></span><span>${u.points} pts</span></div>
        <div class="pc-bar"><div class="pc-bar-fill" style="width:${pct}%"></div></div>
        ${next ? `<div class="pc-level-next">Te faltan ${Math.max(0, next.min - u.points)} pts para <strong>${next.name}</strong></div>` : `<div class="pc-level-next">¡Nivel máximo alcanzado! 👑</div>`}
      </div>
      ${!u.loggedIn ? `<div class="pc-guest">Inicia sesión para guardar tu perfil y competir en el ranking.<a href="cuenta.html">Crear cuenta / Entrar</a></div>` : ''}
    </div>`;
}

// ── Tab: Perfil ───────────────────────────────────────────────────────────
function renderPerfilTab() {
  const u = getProfile();
  const avatars = AVATAR_EMOJIS.map(e =>
    `<button class="avatar-option${u.emoji === e && !u.photo ? ' sel' : ''}" onclick="setAvatarEmoji('${e}')">${e}</button>`).join('');
  const teams = [`<button class="team-option${!u.favoriteTeam ? ' sel' : ''}" onclick="setFavoriteTeam('')"><span class="t-f">🚫</span>Sin selección</button>`]
    .concat(ALL_TEAMS.map(t => `<button class="team-option${u.favoriteTeam === t.name ? ' sel' : ''}" onclick="setFavoriteTeam('${t.name.replace(/'/g, "\\'")}')"><span class="t-f">${t.flag}</span>${t.name}</button>`)).join('');
  const badges = computeBadges();
  const unlocked = badges.filter(b => b.on).length;
  const badgeCards = badges.map(b => `
    <div class="badge-card${b.on ? ' on' : ''}">
      <div class="badge-ic">${b.icon}</div>
      <div class="badge-name">${b.name}</div>
      <div class="badge-desc">${b.desc}</div>
    </div>`).join('');

  return `
    <div class="profile-card">
      <h3 class="pc-h3"><span class="dot"></span> Datos de perfil</h3>
      <label class="pc-label">Nombre para mostrar</label>
      <input class="form-input" id="f-name" value="${esc(u.name).replace(/"/g, '&quot;')}" maxlength="40" placeholder="Tu nombre">
      <label class="pc-label" style="margin-top:12px;">Usuario (@)</label>
      <input class="form-input" id="f-user" value="${esc(u.username)}" maxlength="20" placeholder="tu_usuario">
      <div class="pc-help">3–20 caracteres: letras, números, punto, guion. Será tu nombre público en el ranking.</div>
      <div class="form-error" id="f-err"></div>
      <button class="btn-full btn-blue-full" style="margin-top:10px;" onclick="saveProfile()">Guardar cambios</button>
      ${u.googleName ? `<button class="btn btn-ghost btn-full" style="margin-top:8px;" onclick="useGoogleName()">Usar mi nombre de Google</button>` : ''}
    </div>

    <div class="profile-card">
      <h3 class="pc-h3"><span class="dot"></span> Avatar</h3>
      <div class="avatar-grid">${avatars}</div>
      <div class="pc-upload">
        <span>${u.photo ? '✓ Tienes una foto de perfil' : 'Sube una foto o usa un emoji'}</span>
        <button class="btn btn-orange btn-sm" onclick="document.getElementById('avatar-input').click()">Subir foto</button>
      </div>
    </div>

    <div class="profile-card">
      <h3 class="pc-h3"><span class="dot"></span> Mi selección</h3>
      <div class="pc-help" style="margin:0 0 10px;">Elige tu selección favorita del Mundial.</div>
      <div class="team-grid">${teams}</div>
    </div>

    ${renderFeaturedPicks(u)}

    <div class="profile-card">
      <h3 class="pc-h3"><span class="dot"></span> Tus insignias <span class="pc-count">${unlocked}/6</span></h3>
      <div class="badges-grid">${badgeCards}</div>
      <div class="pc-help" style="margin-top:10px;">Las insignias grises siguen en juego. Gánalas con tus pronósticos.</div>
    </div>

    <div class="profile-card">
      <h3 class="pc-h3"><span class="dot"></span> Idioma</h3>
      <div class="lang-switch">
        <button class="lang-opt${u.language === 'es' ? ' active' : ''}" onclick="setUserLanguage('es')">Español</button>
        <button class="lang-opt${u.language === 'en' ? ' active' : ''}" onclick="setUserLanguage('en')">English</button>
      </div>
    </div>

    <div class="profile-card">
      <button class="btn btn-ghost btn-full" onclick="openHowToPlay()">📖 Cómo se juega</button>
      <button class="btn btn-ghost btn-full" style="margin-top:8px;color:var(--red);border-color:rgba(239,68,68,.3);" onclick="doLogout()">Cerrar sesión</button>
    </div>

    <div class="profile-foot">
      <a href="pages/terminos.html">Términos</a> · <a href="pages/cookies.html">Cookies</a> · <a href="pages/dmca.html">DMCA</a>
      <div class="profile-disc">Puntos recreativos, sin valor monetario.</div>
    </div>`;
}

function renderFeaturedPicks(u) {
  const mine = myPredictions();
  const last = mine.find(x => x.p);
  const nextUp = (typeof MATCHES !== 'undefined' ? MATCHES : [])
    .filter(m => m.status === 'scheduled' && new Date(m.kickoff).getTime() > Date.now())
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))[0];
  return `
    <div class="profile-card">
      <h3 class="pc-h3"><span class="dot"></span> Tus picks destacados</h3>
      <div class="fp-row"><span>🏆 Campeón</span><strong>${u.champion ? `${flagOf(u.champion)} ${esc(u.champion)}` : 'Sin elegir'}</strong></div>
      <div class="fp-row"><span>👟 Goleador</span><strong>${u.topScorer ? esc(u.topScorer) : 'Sin elegir'}</strong></div>
      <div class="fp-row"><span>🎯 Último pronóstico</span><strong>${last ? `${last.m.home.name} ${last.p.hs}-${last.p.as_} ${last.m.away.name}` : '—'}</strong></div>
      <div class="fp-row"><span>📅 Próximo</span><strong>${nextUp ? `${nextUp.home.name} vs ${nextUp.away.name}` : '—'}</strong></div>
      <div class="fp-actions">
        <a class="btn btn-orange btn-sm" href="quiniela.html">Ir a Mi quiniela</a>
        <a class="btn btn-ghost btn-sm" href="quiniela.html">Editar picks extra</a>
      </div>
      ${!mine.length && !u.champion ? `<div class="pc-help" style="margin-top:10px;">Aún no tienes picks destacados. Empieza pronosticando un partido.</div>` : ''}
    </div>`;
}

// ── Tab: Mis pronósticos ──────────────────────────────────────────────────
function renderPredictionsTab() {
  const mine = myPredictions();
  if (!mine.length) {
    return `<div class="profile-card pc-empty">
      <div class="pc-empty-ic">🎯</div>
      <p>Aún no has hecho pronósticos.</p>
      <a class="btn btn-orange btn-sm" href="index.html">Pronosticar un partido</a>
    </div>`;
  }
  const items = mine.map(({ p, m }) => {
    const st = predStatus(m);
    let badge, info, action;
    if (st === 'finished') {
      const pts = predPoints(p, m);
      badge = `<span class="mp-badge sb-final">FINAL</span>`;
      info = `Resultado: <strong>${m.hs}-${m.as}</strong> · ${pts > 0 ? `Ganaste <span class="mp-pts">+${pts} pts</span>` : 'Sin puntos esta vez'}`;
      action = `<a class="btn btn-ghost btn-sm" href="index.html#pred=${m.id}">Ver ganadores</a>`;
    } else if (st === 'locked') {
      badge = `<span class="mp-badge sb-live">EN JUEGO</span>`;
      info = 'Pronóstico cerrado.';
      action = `<a class="btn btn-ghost btn-sm" href="index.html">Ver partido</a>`;
    } else {
      badge = `<span class="mp-badge sb-upcoming">ABIERTO</span>`;
      info = 'Puedes editar hasta el silbatazo inicial.';
      action = `<a class="btn btn-orange btn-sm" href="index.html#pred=${m.id}">Editar</a>`;
    }
    const ft = new Date(m.kickoff).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `
      <div class="mp-card">
        <div class="mp-top">
          <div class="mp-match">${m.home.flag} ${m.home.name} <b>vs</b> ${m.away.name} ${m.away.flag}</div>
          ${badge}
        </div>
        <div class="mp-mid">
          <span class="mp-date">${ft}</span>
          <span class="mp-pick">Tu pick: <strong>${p.hs}-${p.as_}</strong></span>
        </div>
        <div class="mp-info">${info}</div>
        <div class="mp-action">${action}</div>
      </div>`;
  }).join('');
  return `<div class="mp-list">${items}</div>`;
}

// ── Tab: Actividad ────────────────────────────────────────────────────────
function renderActivityTab() {
  let acts = _activity();
  // Si no hay actividad registrada, derivamos algo de los datos actuales
  if (!acts.length) {
    const mine = myPredictions();
    const u = getProfile();
    acts = [];
    if (u.favoriteTeam) acts.push({ label: `Elegiste ${u.favoriteTeam} como tu selección favorita.`, at: '' });
    mine.slice(0, 5).forEach(({ p, m }) => acts.push({ label: `Guardaste tu pronóstico para ${m.home.name} vs ${m.away.name} (${p.hs}-${p.as_}).`, at: '' }));
  }
  if (!acts.length) {
    return `<div class="profile-card pc-empty"><div class="pc-empty-ic">📋</div><p>Aún no hay actividad. Tus movimientos aparecerán aquí.</p></div>`;
  }
  return `<div class="profile-card"><h3 class="pc-h3"><span class="dot"></span> Tu actividad</h3>
    ${acts.map(a => `<div class="act-row"><span class="act-dot"></span><div><div class="act-label">${esc(a.label)}</div>${a.at ? `<div class="act-time">${new Date(a.at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>` : ''}</div></div>`).join('')}
  </div>`;
}

// ── Acciones ──────────────────────────────────────────────────────────────
async function saveProfile() {
  const err = document.getElementById('f-err'); err.textContent = '';
  const name = document.getElementById('f-name').value.trim();
  const user = document.getElementById('f-user').value.trim();
  if (!validateUsername(user)) { err.textContent = 'Usuario inválido: 3–20 caracteres (letras, números, punto, guion).'; return; }
  _saveLocal({ username: user });
  // Nombre → Supabase si hay sesión, si no local
  if (getProfile().loggedIn && typeof Auth.updateName === 'function') {
    const res = await Auth.updateName(name);
    if (res && !res.ok) { err.textContent = res.msg || 'No se pudo guardar el nombre'; return; }
  } else { _saveLocal({ name }); }
  logActivity('profile', 'Actualizaste tu perfil.');
  _showToast('✓ Perfil actualizado', 'var(--green)');
  render();
}
function validateUsername(u) { return /^[a-zA-Z0-9._-]{3,20}$/.test(u || ''); }
async function useGoogleName() { const g = getProfile().googleName; if (!g) return; document.getElementById('f-name').value = g; await saveProfile(); }
function setAvatarEmoji(e) { _saveLocal({ emoji: e }); logActivity('avatar', `Cambiaste tu avatar a ${e}.`); _showToast('Avatar actualizado', 'var(--green)'); render(); }
function setFavoriteTeam(name) { _saveLocal({ favoriteTeam: name }); if (name) logActivity('team', `Elegiste ${name} como tu selección favorita.`); _showToast(name ? `Selección: ${name}` : 'Sin selección', 'var(--blue)'); render(); }
function setUserLanguage(lang) { _saveLocal({ language: lang }); _showToast(lang === 'es' ? 'Idioma: Español' : 'Language: English', 'var(--blue)'); render(); }
async function onAvatarPicked(e) {
  const file = e.target.files[0]; if (!file) return;
  if (!getProfile().loggedIn) { _showToast('Inicia sesión para subir una foto', 'var(--red)'); return; }
  _showToast('Subiendo foto...', 'var(--blue)');
  const res = await Auth.uploadAvatar(file);
  if (!res || !res.ok) { _showToast((res && res.msg) || 'No se pudo subir', 'var(--red)'); return; }
  logActivity('avatar', 'Actualizaste tu foto de perfil.');
  _showToast('Foto actualizada', 'var(--green)'); render();
}
async function doLogout() {
  if (typeof Auth !== 'undefined' && Auth.logout) { try { await Auth.logout(); } catch (e) {} }
  location.href = 'index.html';
}

// ── Modal "Cómo se juega" ─────────────────────────────────────────────────
function openHowToPlay() {
  const steps = [
    'Pronostica cada partido antes del silbatazo inicial.',
    'Suma puntos por participar, acertar el ganador o el marcador exacto.',
    'Revisa tus puntos cuando termine el partido.',
    'Sube en el ranking y gana insignias.',
    'Los puntos son recreativos y no tienen valor monetario.',
  ];
  const ov = document.createElement('div');
  ov.className = 'howto-overlay';
  ov.onclick = (ev) => { if (ev.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="howto-box">
    <button class="howto-x" onclick="this.closest('.howto-overlay').remove()">×</button>
    <h2>Cómo se juega <span>en TVContigo</span></h2>
    <ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>
    <button class="btn btn-orange btn-full" onclick="this.closest('.howto-overlay').remove()">¡Entendido!</button>
  </div>`;
  document.body.appendChild(ov);
}

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function _showToast(msg, color = 'var(--surface-3)') {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.style.borderColor = color;
  t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000);
}
