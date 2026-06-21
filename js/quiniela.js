// ── TVContigo — Quiniela Mundialista (sistema de predicción) ──────────────

// Todos los países del Mundial 2026 — derivados de los partidos reales (data.js)
const Q_TEAMS = (() => {
  const map = new Map();
  (typeof MATCHES !== 'undefined' ? MATCHES : []).forEach(m => {
    if (!map.has(m.home.name)) map.set(m.home.name, m.home.flag);
    if (!map.has(m.away.name)) map.set(m.away.name, m.away.flag);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([name, flag]) => ({ name, flag }));
})();

let _pools = [], _stats = {}, _myEntries = [];
let _selectedPool = null, _pickedChampion = null;

document.addEventListener('DOMContentLoaded', async () => {
  await authInit();
  trackEvent('page', 'quiniela');
  trackEvent('quiniela', 'visit');
  await loadAll();
});

async function loadAll() {
  const user = Auth.getUser();
  const reqs = [
    sb.from('quiniela_pool').select('*').order('entry_amount'),
    sb.rpc('quiniela_stats'),
  ];
  if (user) reqs.push(sb.from('quiniela_entries').select('*').eq('user_id', user.id));
  const res = await Promise.all(reqs);
  _pools = res[0].data || [];
  _stats = res[1].data || {};
  _myEntries = user ? (res[2].data || []) : [];
  renderApp();
}

function verifiedOf(pool) { return (_stats[pool.id] && _stats[pool.id].verified) || 0; }

function countsOf(pool) {
  const counts = { ...(pool.seed_picks || {}) };
  const real = (_stats[pool.id] && _stats[pool.id].counts) || {};
  for (const [team, n] of Object.entries(real)) counts[team] = (counts[team] || 0) + Number(n);
  return counts;
}

// ── Router principal ──────────────────────────────────────────────────────
function renderApp() {
  const el = document.getElementById('q-app');
  if (!Auth.isLoggedIn()) {
    el.innerHTML = `
      <div class="q-card" style="text-align:center;">
        <h3 style="justify-content:center;">Inicia sesión para participar</h3>
        <p style="color:var(--text-dim);font-size:13px;margin-bottom:16px;">Necesitas una cuenta gratuita para registrar tu pronóstico.</p>
        <button class="btn-full btn-blue-full" onclick="location.href='index.html'">Crear cuenta / Entrar</button>
      </div>${renderPoolList(true)}`;
    return;
  }
  if (_selectedPool) { renderPoolDetail(el); return; }
  el.innerHTML = renderPoolList(false);
}

function renderPoolList(readonly) {
  const openPools = _pools.filter(p => p.status === 'open');
  const otherPools = _pools.filter(p => p.status !== 'open');
  const renderCard = (p) => {
    const mine = _myEntries.find(e => e.pool_id === p.id);
    const isOpen = p.status === 'open';
    const tag = mine ? `<span class="status-pill status-verified" style="font-size:10px;padding:3px 8px;">✓ Inscrito</span>` : '';
    const participants = verifiedOf(p);
    return `
    <div class="pool-card" onclick="${readonly ? "location.href='index.html'" : `openPool(${p.id})`}" ${!isOpen ? 'style="opacity:.6;"' : ''}>
      <div>
        <div class="pool-name">${p.name}</div>
        <div class="pool-sub">🎉 Gratis · ${isOpen ? 'Abierta' : p.status === 'settled' ? 'Finalizada' : 'Cerrada'} ${tag}</div>
      </div>
      <div class="pool-pot">
        <div class="pool-pot-val">${participants}</div>
        <div class="pool-pot-lbl">PARTICIPANTES</div>
      </div>
    </div>`;
  };
  return `
    <div style="font-size:12px;color:var(--text-dim);margin:4px 0 10px;font-weight:600;letter-spacing:.5px;">PREDICCIÓN DEL CAMPEÓN</div>
    ${openPools.map(renderCard).join('')}
    ${otherPools.length ? `<div style="font-size:11px;color:var(--text-muted);margin:12px 0 6px;letter-spacing:.5px;">OTRAS QUINIELAS</div>${otherPools.map(renderCard).join('')}` : ''}`;
}

function openPool(id) {
  _selectedPool = _pools.find(p => p.id === id);
  _pickedChampion = null;
  renderApp();
}
function backToPools() { _selectedPool = null; renderApp(); }

function renderPoolDetail(el) {
  const p = _selectedPool;
  const mine = _myEntries.find(e => e.pool_id === p.id);
  const participants = verifiedOf(p);

  let body;
  if (p.status === 'settled') body = renderSettled(p);
  else if (mine) body = renderMyEntry(p, mine);
  else if (p.status === 'closed') body = `<div class="q-card" style="text-align:center;"><h3 style="justify-content:center;">Pronósticos cerrados</h3><p style="color:var(--text-dim);font-size:13px;">Esta quiniela ya no acepta nuevos pronósticos.</p></div>`;
  else body = renderJoinForm(p);

  el.innerHTML = `
    <a class="back-link" onclick="backToPools()" style="cursor:pointer;">← Otras quinielas</a>
    <div class="q-hero" style="padding:18px;margin-bottom:14px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:1px;">${p.name}</div>
      <div style="display:flex;justify-content:center;gap:24px;margin-top:8px;">
        <div>
          <div style="font-family:'Bebas Neue';font-size:32px;color:var(--orange);line-height:1;">${participants}</div>
          <div style="font-size:9px;color:var(--text-muted);">PARTICIPANTES</div>
        </div>
        <div>
          <div style="font-family:'Bebas Neue';font-size:32px;color:var(--blue);line-height:1;">🏆</div>
          <div style="font-size:9px;color:var(--text-muted);">CAMPEÓN</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--green);margin-top:8px;font-weight:700;">🎉 Participación gratuita</div>
    </div>
    ${body}
    ${renderPicks(p)}`;
}

function renderJoinForm(p) {
  return `
    <div class="q-card">
      <h3><span class="num">1</span> ¿Quién será el campeón?</h3>
      <div class="team-grid">
        ${Q_TEAMS.map(t => `<div class="team-opt" onclick="pickChampion('${t.name}', this)"><span class="f">${t.flag}</span>${t.name}</div>`).join('')}
      </div>
      <div style="margin-top:14px;">
        <label class="form-label">Desempate: goles totales del campeón en el torneo</label>
        <input class="form-input" type="number" id="tiebreak" min="0" max="50" placeholder="Ej. 14" value="12">
      </div>
    </div>

    <div class="q-card">
      <h3><span class="num">2</span> Confirmar pronóstico</h3>
      <div style="font-size:13px;color:var(--text-dim);line-height:1.9;margin-bottom:14px;">
        <div>Campeón elegido: <strong id="conf-team" style="color:var(--orange);">—</strong></div>
        <div>Participación: <strong style="color:var(--green);">🎉 Gratis</strong></div>
      </div>
      <label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--text-dim);margin-bottom:14px;cursor:pointer;">
        <input type="checkbox" id="accept-terms" style="margin-top:3px;">
        <span>Acepto el <a href="pages/reglamento-quiniela.html" target="_blank" style="color:var(--blue);">Reglamento</a>, los <a href="pages/terminos.html" target="_blank" style="color:var(--blue);">Términos</a> y el <a href="pages/privacidad.html" target="_blank" style="color:var(--blue);">Aviso de Privacidad</a>.</span>
      </label>
      <button class="btn-full btn-orange" id="join-btn" style="background:var(--orange);color:#fff;" onclick="submitEntry()">¡Registrar pronóstico!</button>
      <div class="form-error" id="join-error"></div>
    </div>`;
}

function pickChampion(name, elx) {
  _pickedChampion = name;
  document.querySelectorAll('.team-opt').forEach(t => t.classList.remove('sel'));
  elx.classList.add('sel');
  const c = document.getElementById('conf-team'); if (c) c.textContent = name;
}

async function submitEntry() {
  const err = document.getElementById('join-error'); err.textContent = '';
  const p = _selectedPool;
  if (!_pickedChampion) { err.textContent = 'Elige un campeón.'; return; }
  if (!document.getElementById('accept-terms').checked) { err.textContent = 'Debes aceptar el reglamento.'; return; }

  const user = Auth.getUser();
  const btn = document.getElementById('join-btn');
  btn.textContent = 'Registrando...'; btn.disabled = true;

  const { error } = await sb.from('quiniela_entries').insert({
    user_id: user.id, pool_id: p.id, user_name: user.name, email: user.email,
    champion_pick: _pickedChampion,
    tiebreak_goals: parseInt(document.getElementById('tiebreak').value) || 0,
    amount: 0, fee: 0, pool_contribution: 0,
    payment_method: 'free',
    payment_ref: 'gratis',
    payment_status: 'verified',
  });

  btn.textContent = '¡Registrar pronóstico!'; btn.disabled = false;
  if (error) { err.textContent = error.message.includes('duplicate') ? 'Ya tienes un pronóstico en esta quiniela.' : 'Error: ' + error.message; return; }

  _showToast('¡Pronóstico registrado! 🎉', 'var(--green)');
  await loadAll();
  _selectedPool = _pools.find(x => x.id === p.id);
  renderApp();
}

function renderMyEntry(p, e) {
  const team = Q_TEAMS.find(t => t.name === e.champion_pick);
  const sm = {
    pending:  { c:'status-pending',  t:'⏳ Procesando...' },
    verified: { c:'status-verified', t:'✓ Pronóstico registrado' },
    rejected: { c:'status-rejected', t:'✕ No válido' },
  }[e.payment_status];
  return `
    ${e.payment_status === 'verified' ? `
    <div class="confirm-box" style="margin-bottom:14px;">
      <div style="font-size:14px;font-weight:700;color:var(--green);">🎉 ¡Pronóstico registrado!</div>
      <div style="font-size:12px;color:var(--text-dim);margin-top:4px;">Tu elección está confirmada. Al terminar el torneo verás si acertaste al campeón.</div>
    </div>` : ''}
    <div class="q-card" style="text-align:center;">
      <div style="font-size:46px;">${team ? team.flag : '🏆'}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px;">${e.champion_pick}</div>
      <p style="color:var(--text-dim);font-size:12px;margin:4px 0 12px;">Tu pronóstico de campeón</p>
      <div class="status-pill ${sm.c}">${sm.t}</div>
      ${p.status === 'open' ? `
        <div id="edit-pick-box" style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px;">
          <p style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">🔓 Puedes cambiar tu elección hasta que termine la fase de grupos.</p>
          <button class="btn btn-ghost" onclick="toggleEditPick()">Cambiar mi elección</button>
          <div id="edit-pick-grid" style="display:none;margin-top:12px;">
            <div class="team-grid">
              ${Q_TEAMS.map(t => `<div class="team-opt ${t.name===e.champion_pick?'sel':''}" onclick="reSelectChampion('${t.name.replace(/'/g,"\\'")}', this)"><span class="f">${t.flag}</span>${t.name}</div>`).join('')}
            </div>
            <button class="btn-full btn-orange" style="background:var(--orange);color:#fff;margin-top:12px;" onclick="saveNewPick(${p.id})">Guardar nueva elección</button>
            <div class="form-error" id="edit-pick-err"></div>
          </div>
        </div>` : ''}
    </div>`;
}

let _reChampion = null;
function toggleEditPick() {
  const g = document.getElementById('edit-pick-grid');
  if (g) g.style.display = g.style.display === 'none' ? 'block' : 'none';
}
function reSelectChampion(name, el) {
  _reChampion = name;
  document.querySelectorAll('#edit-pick-grid .team-opt').forEach(t => t.classList.remove('sel'));
  el.classList.add('sel');
}
async function saveNewPick(poolId) {
  const err = document.getElementById('edit-pick-err');
  err.textContent = '';
  if (!_reChampion) { err.textContent = 'Elige un equipo.'; return; }
  const { data, error } = await sb.rpc('update_my_pick', { p_pool_id: poolId, p_champion: _reChampion, p_tiebreak: 12 });
  if (error) { err.textContent = 'Error: ' + error.message; return; }
  if (data && !data.ok) { err.textContent = data.msg; return; }
  _showToast('Elección actualizada ⚽', 'var(--green)');
  _reChampion = null;
  await loadAll();
  _selectedPool = _pools.find(x => x.id === poolId);
  renderApp();
}

// ── Distribución de pronósticos (reemplaza "Reparto del bote") ────────────
function renderPicks(p) {
  const counts = countsOf(p);
  const keys = Object.keys(counts);
  if (!keys.length) return '';
  const total = keys.reduce((s, t) => s + Number(counts[t]), 0);
  const myTeam = (_myEntries.find(e => e.pool_id === p.id) || {}).champion_pick;
  const teams = keys.sort((a, b) => {
    if (a === myTeam) return -1; if (b === myTeam) return 1;
    return counts[b] - counts[a];
  });
  return `
    <div class="q-card">
      <h3>📊 Pronósticos</h3>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">${total} pronóstico${total === 1 ? '' : 's'} registrado${total === 1 ? '' : 's'}</div>
      ${teams.map(team => {
        const t = Q_TEAMS.find(x => x.name === team);
        const n = Number(counts[team]);
        const pct = total ? Math.round(n / total * 100) : 0;
        const isMe = team === myTeam;
        return `<div class="bounty-row ${isMe ? 'mine' : ''}">
          <span style="font-size:22px;">${t ? t.flag : '🏳️'}</span>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;">${team}${isMe ? ' · <span style="color:var(--orange)">tu pick</span>' : ''}</div>
            <div style="margin-top:5px;height:4px;background:var(--surface-3);border-radius:2px;">
              <div style="height:4px;background:${isMe ? 'var(--orange)' : 'var(--blue)'};border-radius:2px;width:${pct}%;transition:width .4s;"></div>
            </div>
          </div>
          <div style="text-align:right;min-width:52px;">
            <div class="bounty-amt" style="color:var(--text);">${pct}%</div>
            <div style="font-size:9px;color:var(--text-muted);">${n} ${n === 1 ? 'pick' : 'picks'}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function renderSettled(p) {
  const champ = p.result_champion;
  const counts = countsOf(p);
  const nWin = counts[champ] || 0;
  const team = Q_TEAMS.find(t => t.name === champ);
  const mine = _myEntries.find(e => e.pool_id === p.id);
  const iWon = mine && mine.payment_status === 'verified' && mine.champion_pick === champ;
  return `
    <div class="q-card" style="text-align:center;">
      <div style="font-size:46px;">${team ? team.flag : '🏆'}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:var(--orange);">${champ} CAMPEÓN</div>
      <div style="margin:14px 0;padding:16px;background:var(--surface-2);border-radius:12px;">
        <div style="font-size:13px;color:var(--text-dim);">Acertaron: <strong>${nWin} pronóstico${nWin === 1 ? '' : 's'} correcto${nWin === 1 ? '' : 's'}</strong></div>
        ${iWon ? '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:28px;color:var(--green);margin-top:6px;">🏆 ¡ACERTASTE!</div>' : ''}
      </div>
      ${iWon
        ? `<div class="status-pill status-verified" style="font-size:14px;">🎉 ¡Pronóstico correcto! Eres un experto.</div>`
        : (mine ? `<p style="color:var(--text-dim);font-size:13px;">No acertaste esta vez. ¡Suerte en la próxima!</p>` : '')}
    </div>`;
}

function _showToast(msg, color = 'var(--surface-3)') {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.style.borderColor = color;
  t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000);
}
