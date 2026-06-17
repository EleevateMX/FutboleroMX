// ── TVContigo — Perfil del usuario ────────────────────────────────────────

// Banderas de todos los países — derivadas de los partidos reales (data.js)
const _FLAGS = (() => {
  const m = new Map();
  (typeof MATCHES !== 'undefined' ? MATCHES : []).forEach(x => {
    m.set(x.home.name, x.home.flag); m.set(x.away.name, x.away.flag);
  });
  return m;
})();
function flagOf(name) { return _FLAGS.get(name) || '🏳️'; }

let _pools = [], _stats = {}, _myEntries = [];

document.addEventListener('DOMContentLoaded', async () => {
  await authInit();
  if (!Auth.isLoggedIn()) { location.href = 'index.html'; return; }
  await loadProfile();
  document.getElementById('avatar-input').addEventListener('change', onAvatarPicked);
});

let _refCode = '';
async function loadProfile() {
  const user = Auth.getUser();
  const [{ data: pools }, { data: stats }, { data: mine }, { data: prof }] = await Promise.all([
    sb.from('quiniela_pool').select('*').order('entry_amount'),
    sb.rpc('quiniela_stats'),
    sb.from('quiniela_entries').select('*').eq('user_id', user.id),
    sb.from('profiles').select('referral_code, pts').eq('id', user.id).single(),
  ]);
  _pools = pools || [];
  _stats = stats || {};
  _myEntries = mine || [];
  _refCode = prof ? (prof.referral_code || '') : '';
  render();
}

function money(n, cur) { return '$' + Number(Math.round(n)).toLocaleString('es-MX') + ' ' + (cur || 'MXN'); }
function potOf(p) {
  const per = (p.entry_amount - p.service_fee);
  const v = (_stats[p.id] && _stats[p.id].verified) || 0;
  return (p.base_pot || 0) + v * per;
}
function countsOf(p) {
  const c = { ...(p.seed_picks || {}) };
  const real = (_stats[p.id] && _stats[p.id].counts) || {};
  for (const [team, n] of Object.entries(real)) c[team] = (c[team] || 0) + Number(n);
  return c;
}

function render() {
  const u = Auth.getUser();
  const el = document.getElementById('p-content');
  const initials = (u.name || '?').slice(0, 2).toUpperCase();
  const avatarStyle = u.avatar ? `background-image:url('${u.avatar}')` : '';

  el.innerHTML = `
    <div class="p-card" style="text-align:center;">
      <div class="avatar-big" style="${avatarStyle}" onclick="document.getElementById('avatar-input').click()">
        ${u.avatar ? '' : initials}
        <div class="avatar-overlay">Cambiar</div>
      </div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px;">${u.name}</div>
      <div style="font-size:12px;color:var(--text-dim);">${u.email}</div>
      <button class="btn btn-sm btn-ghost" style="margin-top:12px;" onclick="document.getElementById('avatar-input').click()">📷 Cambiar foto</button>
    </div>

    <div class="p-card">
      <h3><span class="dot"></span> Mi nombre</h3>
      <input class="form-input" type="text" id="name-input" value="${(u.name || '').replace(/"/g,'&quot;')}" placeholder="Tu nombre">
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn-full btn-blue-full" onclick="saveName()">Guardar nombre</button>
        ${u.googleName ? `<button class="btn btn-ghost" style="white-space:nowrap;padding:0 14px;" onclick="useGoogleName()">Usar de Google</button>` : ''}
      </div>
      <div class="form-error" id="name-err"></div>
    </div>

    <div class="p-card">
      <h3><span class="dot"></span> 🎁 Invita y gana puntos</h3>
      <p style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Comparte tu link. Por cada amigo que se registre, ganas <strong>+10 puntos</strong> y subes en el ranking.</p>
      <div style="display:flex;gap:8px;">
        <input class="form-input" id="ref-link" readonly value="https://tvcontigo.site/?ref=${_refCode}" style="flex:1;font-size:12px;">
        <button class="btn btn-orange" style="padding:0 16px;white-space:nowrap;" onclick="copyRef()">Copiar</button>
      </div>
      <button class="btn-full btn-blue-full" style="margin-top:10px;" onclick="shareRef()">📲 Compartir mi link</button>
    </div>

    ${renderMyTickets()}

    <div class="p-card">
      <h3><span class="dot"></span> 🏆 QUINIELA · Botes y reparto</h3>
      ${renderBounty()}
    </div>

    <div class="p-card" style="text-align:center;">
      <button class="btn btn-ghost" onclick="doLogout()">Cerrar sesión</button>
    </div>`;
}

function renderMyTickets() {
  if (!_myEntries.length) {
    return `
    <div class="p-card" style="text-align:center;">
      <h3 style="justify-content:center;"><span class="dot"></span> Mis quinielas</h3>
      <p style="color:var(--text-dim);font-size:13px;margin-bottom:14px;">Aún no participas en ninguna quiniela.</p>
      <a href="quiniela.html" class="btn-full btn-orange" style="background:var(--orange);color:#fff;text-decoration:none;display:block;">Participar ahora →</a>
    </div>`;
  }
  const sm = {
    pending:  { c:'var(--orange)', t:'⏳ Verificando' },
    verified: { c:'var(--green)',  t:'✓ Confirmado' },
    rejected: { c:'var(--red)',    t:'✕ Rechazado' },
  };
  return `
    <div class="p-card">
      <h3><span class="dot"></span> Mis equipos elegidos</h3>
      ${_myEntries.map(e => {
        const pool = _pools.find(p => p.id === e.pool_id) || {};
        const s = sm[e.payment_status] || sm.pending;
        return `<div class="bounty-row mine" style="margin-bottom:8px;">
          <span class="bounty-flag">${flagOf(e.champion_pick)}</span>
          <div class="bounty-team">
            <div class="bounty-team-name">${e.champion_pick}</div>
            <div class="bounty-team-sub">${pool.name || 'Quiniela'} · <span style="color:${s.c}">${s.t}</span></div>
          </div>
        </div>`;
      }).join('')}
      <a href="quiniela.html" style="display:block;text-align:center;color:var(--blue);font-size:13px;font-weight:600;margin-top:10px;text-decoration:none;">Unirme a otra quiniela →</a>
    </div>`;
}

function renderBounty() {
  // Muestra el reparto de cada pool donde participo; si no participo en ninguno, muestra el primero
  const myPoolIds = new Set(_myEntries.map(e => e.pool_id));
  const poolsToShow = _myEntries.length ? _pools.filter(p => myPoolIds.has(p.id)) : _pools.slice(0, 1);
  const myPickByPool = {};
  _myEntries.forEach(e => { myPickByPool[e.pool_id] = e.champion_pick; });

  return poolsToShow.map(p => {
    const counts = countsOf(p);
    const total = potOf(p);
    const myTeam = myPickByPool[p.id];
    const teams = Object.keys(counts).sort((a, b) => {
      if (a === myTeam) return -1; if (b === myTeam) return 1; return counts[b] - counts[a];
    });
    return `
      <div style="margin-bottom:18px;">
        <div class="big-pot">
          <div class="val">${money(total, p.currency)}</div>
          <div class="lbl">${p.name.toUpperCase()} · BOTE</div>
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">Si ese equipo es campeón, el bote se divide entre quienes lo eligieron:</div>
        ${teams.map(team => {
          const n = counts[team];
          const mine = team === myTeam;
          return `<div class="bounty-row ${mine ? 'mine' : ''}">
            <span class="bounty-flag">${flagOf(team)}</span>
            <div class="bounty-team">
              <div class="bounty-team-name">${team} ${mine ? '· <span style="color:var(--orange)">tu equipo</span>' : ''}</div>
              <div class="bounty-team-sub">${n} ${n === 1 ? 'jugador' : 'jugadores'}</div>
            </div>
            <div class="bounty-payout"><div class="bounty-amt">${money(total / n, p.currency)}</div><div class="bounty-amt-sub">si gana, c/u</div></div>
          </div>`;
        }).join('')}
      </div>`;
  }).join('') + `<a href="quiniela.html" style="display:block;text-align:center;color:var(--blue);font-size:13px;font-weight:600;margin-top:4px;text-decoration:none;">Ver todas las quinielas →</a>`;
}

async function saveName() {
  const err = document.getElementById('name-err'); err.textContent = '';
  const res = await Auth.updateName(document.getElementById('name-input').value);
  if (!res.ok) { err.textContent = res.msg; return; }
  _showToast('Nombre actualizado', 'var(--green)');
  render();
}
async function useGoogleName() {
  const g = Auth.getUser().googleName; if (!g) return;
  document.getElementById('name-input').value = g; await saveName();
}
async function onAvatarPicked(e) {
  const file = e.target.files[0]; if (!file) return;
  _showToast('Subiendo foto...', 'var(--blue)');
  const res = await Auth.uploadAvatar(file);
  if (!res.ok) { _showToast(res.msg, 'var(--red)'); return; }
  _showToast('Foto actualizada', 'var(--green)'); render();
}
function copyRef() {
  const link = document.getElementById('ref-link').value;
  navigator.clipboard?.writeText(link);
  _showToast('🔗 Link copiado', 'var(--green)');
}
async function shareRef() {
  const link = document.getElementById('ref-link').value;
  const data = { title: 'TVContigo', text: '⚽ Mira el Mundial 2026 gratis en TVContigo:', url: link };
  if (navigator.share) { try { await navigator.share(data); } catch (e) {} }
  else { navigator.clipboard?.writeText(link); _showToast('🔗 Link copiado', 'var(--green)'); }
}

async function doLogout() { await Auth.logout(); location.href = 'index.html'; }

function _showToast(msg, color = 'var(--surface-3)') {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.style.borderColor = color;
  t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000);
}
