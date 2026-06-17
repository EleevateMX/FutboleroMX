// ── TVContigo — Perfil del usuario ────────────────────────────────────────

// Equipos candidatos (mismos de la quiniela)
const P_TEAMS = [
  { name:'Argentina', flag:'🇦🇷' }, { name:'Brasil', flag:'🇧🇷' }, { name:'Francia', flag:'🇫🇷' },
  { name:'España', flag:'🇪🇸' }, { name:'Inglaterra', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' }, { name:'Alemania', flag:'🇩🇪' },
  { name:'Portugal', flag:'🇵🇹' }, { name:'Países Bajos', flag:'🇳🇱' }, { name:'México', flag:'🇲🇽' },
  { name:'EE.UU.', flag:'🇺🇸' }, { name:'Bélgica', flag:'🇧🇪' }, { name:'Uruguay', flag:'🇺🇾' },
  { name:'Croacia', flag:'🇭🇷' }, { name:'Colombia', flag:'🇨🇴' }, { name:'Marruecos', flag:'🇲🇦' },
  { name:'Japón', flag:'🇯🇵' },
];

let _pool = null, _entries = [], _myEntry = null;

document.addEventListener('DOMContentLoaded', async () => {
  await authInit();
  if (!Auth.isLoggedIn()) { location.href = 'index.html'; return; }
  await loadProfile();

  document.getElementById('avatar-input').addEventListener('change', onAvatarPicked);
});

async function loadProfile() {
  const user = Auth.getUser();
  const [{ data: pool }, { data: entries }, { data: mine }] = await Promise.all([
    sb.from('quiniela_pool').select('*').eq('id', 1).single(),
    sb.from('quiniela_entries').select('user_id, champion_pick, payment_status').order('created_at'),
    sb.from('quiniela_entries').select('*').eq('user_id', user.id).maybeSingle(),
  ]);
  _pool = pool || {};
  _entries = entries || [];
  _myEntry = mine || null;
  render();
}

function money(n) {
  return '$' + Number(Math.round(n)).toLocaleString('es-MX') + ' ' + (_pool.currency || 'MXN');
}

function render() {
  const u = Auth.getUser();
  const el = document.getElementById('p-content');
  const initials = (u.name || '?').slice(0, 2).toUpperCase();
  const avatarStyle = u.avatar ? `background-image:url('${u.avatar}')` : '';

  el.innerHTML = `
    <!-- Tarjeta de perfil -->
    <div class="p-card" style="text-align:center;">
      <div class="avatar-big" style="${avatarStyle}" onclick="document.getElementById('avatar-input').click()">
        ${u.avatar ? '' : initials}
        <div class="avatar-overlay">Cambiar</div>
      </div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px;">${u.name}</div>
      <div style="font-size:12px;color:var(--text-dim);">${u.email}</div>
      <button class="btn btn-sm btn-ghost" style="margin-top:12px;" onclick="document.getElementById('avatar-input').click()">📷 Cambiar foto</button>
    </div>

    <!-- Editar nombre -->
    <div class="p-card">
      <h3><span class="dot"></span> Mi nombre</h3>
      <input class="form-input" type="text" id="name-input" value="${(u.name || '').replace(/"/g,'&quot;')}" placeholder="Tu nombre">
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn-full btn-blue-full" onclick="saveName()">Guardar nombre</button>
        ${u.googleName ? `<button class="btn btn-ghost" style="white-space:nowrap;padding:0 14px;" onclick="useGoogleName()">Usar de Google</button>` : ''}
      </div>
      <div class="form-error" id="name-err"></div>
    </div>

    <!-- Mi boleto de la quiniela -->
    ${renderMyTicket()}

    <!-- Bounty / reparto del pozo -->
    <div class="p-card">
      <h3><span class="dot"></span> 🏆 QUINIELA · Bounty</h3>
      ${renderBounty()}
    </div>

    <!-- Cerrar sesión -->
    <div class="p-card" style="text-align:center;">
      <button class="btn btn-ghost" onclick="doLogout()">Cerrar sesión</button>
    </div>`;
}

function renderMyTicket() {
  if (!_myEntry) {
    return `
    <div class="p-card" style="text-align:center;">
      <h3 style="justify-content:center;"><span class="dot"></span> Mi quiniela</h3>
      <p style="color:var(--text-dim);font-size:13px;margin-bottom:14px;">Aún no participas en la Quiniela Mundialista.</p>
      <a href="quiniela.html" class="btn-full btn-orange" style="background:var(--orange);color:#fff;text-decoration:none;display:block;">Participar ahora →</a>
    </div>`;
  }
  const team = P_TEAMS.find(t => t.name === _myEntry.champion_pick);
  const statusMap = {
    pending:  { c:'var(--orange)', t:'⏳ Pago pendiente' },
    verified: { c:'var(--green)',  t:'✓ Boleto confirmado' },
    rejected: { c:'var(--red)',    t:'✕ Pago rechazado' },
  };
  const s = statusMap[_myEntry.payment_status] || statusMap.pending;
  return `
    <div class="p-card" style="text-align:center;">
      <h3 style="justify-content:center;"><span class="dot"></span> Mi equipo elegido</h3>
      <div style="font-size:46px;">${team ? team.flag : '🏆'}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px;">${_myEntry.champion_pick}</div>
      <div style="font-size:12px;color:${s.c};font-weight:700;margin-top:6px;">${s.t}</div>
    </div>`;
}

function renderBounty() {
  const verified = _entries.filter(e => e.payment_status === 'verified');
  const poolPer = (_pool.entry_amount ?? 100) - (_pool.service_fee ?? 20);
  const base = _pool.base_pot ?? 1000;
  const total = base + verified.length * poolPer;

  // Conteo de boletos verificados por equipo
  const counts = {};
  verified.forEach(e => { counts[e.champion_pick] = (counts[e.champion_pick] || 0) + 1; });

  const myTeam = _myEntry ? _myEntry.champion_pick : null;

  let rows = '';
  // Ordena: mi equipo primero, luego por número de boletos
  const teams = Object.keys(counts).sort((a, b) => {
    if (a === myTeam) return -1; if (b === myTeam) return 1;
    return counts[b] - counts[a];
  });

  if (teams.length === 0) {
    rows = `<p style="font-size:13px;color:var(--text-dim);text-align:center;padding:8px 0;">
      Aún no hay boletos confirmados. ¡Sé el primero y llévate el bote base!</p>`;
  } else {
    rows = teams.map(team => {
      const t = P_TEAMS.find(x => x.name === team);
      const n = counts[team];
      const payout = total / n;
      const mine = team === myTeam;
      return `
        <div class="bounty-row ${mine ? 'mine' : ''}">
          <span class="bounty-flag">${t ? t.flag : '🏳️'}</span>
          <div class="bounty-team">
            <div class="bounty-team-name">${team} ${mine ? '· <span style="color:var(--orange)">tu equipo</span>' : ''}</div>
            <div class="bounty-team-sub">${n} ${n === 1 ? 'persona' : 'personas'} lo eligieron</div>
          </div>
          <div class="bounty-payout">
            <div class="bounty-amt">${money(payout)}</div>
            <div class="bounty-amt-sub">si gana, c/u</div>
          </div>
        </div>`;
    }).join('');
  }

  return `
    <div class="big-pot">
      <div class="val">${money(total)}</div>
      <div class="lbl">BOTE TOTAL ACUMULADO</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">Incluye ${money(base)} de bote base · ${verified.length} ${verified.length===1?'boleto':'boletos'}</div>
    </div>
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">
      Si tu equipo es campeón, el bote se divide entre quienes también lo eligieron:
    </div>
    ${rows}
    <a href="quiniela.html" style="display:block;text-align:center;color:var(--blue);font-size:13px;font-weight:600;margin-top:12px;text-decoration:none;">Ver toda la quiniela →</a>`;
}

async function saveName() {
  const err = document.getElementById('name-err');
  err.textContent = '';
  const name = document.getElementById('name-input').value;
  const res = await Auth.updateName(name);
  if (!res.ok) { err.textContent = res.msg; return; }
  _showToast('Nombre actualizado', 'var(--green)');
  render();
}

async function useGoogleName() {
  const g = Auth.getUser().googleName;
  if (!g) return;
  document.getElementById('name-input').value = g;
  await saveName();
}

async function onAvatarPicked(e) {
  const file = e.target.files[0];
  if (!file) return;
  _showToast('Subiendo foto...', 'var(--blue)');
  const res = await Auth.uploadAvatar(file);
  if (!res.ok) { _showToast(res.msg, 'var(--red)'); return; }
  _showToast('Foto actualizada', 'var(--green)');
  render();
}

async function doLogout() {
  await Auth.logout();
  location.href = 'index.html';
}

function _showToast(msg, color = 'var(--surface-3)') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.borderColor = color;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
