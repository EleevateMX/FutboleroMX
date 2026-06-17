// ── TVContigo — Quiniela Mundialista (multi-pool) ─────────────────────────

const Q_TEAMS = [
  { name:'Argentina', flag:'🇦🇷' }, { name:'Brasil', flag:'🇧🇷' }, { name:'Francia', flag:'🇫🇷' },
  { name:'España', flag:'🇪🇸' }, { name:'Inglaterra', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' }, { name:'Alemania', flag:'🇩🇪' },
  { name:'Portugal', flag:'🇵🇹' }, { name:'Países Bajos', flag:'🇳🇱' }, { name:'México', flag:'🇲🇽' },
  { name:'EE.UU.', flag:'🇺🇸' }, { name:'Bélgica', flag:'🇧🇪' }, { name:'Uruguay', flag:'🇺🇾' },
  { name:'Croacia', flag:'🇭🇷' }, { name:'Colombia', flag:'🇨🇴' }, { name:'Marruecos', flag:'🇲🇦' },
  { name:'Japón', flag:'🇯🇵' }, { name:'Noruega', flag:'🇳🇴' },
];

let _pools = [], _pay = {}, _entries = [], _myEntries = [];
let _selectedPool = null, _pickedChampion = null, _payMethod = 'nat';

document.addEventListener('DOMContentLoaded', async () => {
  await authInit();
  await loadAll();
});

async function loadAll() {
  const user = Auth.getUser();
  const reqs = [
    sb.from('quiniela_pool').select('*').order('entry_amount'),
    sb.from('pay_config').select('*').eq('id', 1).single(),
    sb.from('quiniela_public').select('pool_id, champion_pick, payment_status'),
  ];
  if (user) reqs.push(sb.from('quiniela_entries').select('*').eq('user_id', user.id));
  const res = await Promise.all(reqs);
  _pools = res[0].data || [];
  _pay = res[1].data || {};
  _entries = res[2].data || [];
  _myEntries = user ? (res[3].data || []) : [];
  renderApp();
}

function money(n, cur) { return '$' + Number(Math.round(n)).toLocaleString('es-MX') + ' ' + (cur || 'MXN'); }

function potOf(pool) {
  const per = (pool.entry_amount - pool.service_fee);
  const verified = _entries.filter(e => e.pool_id === pool.id && e.payment_status === 'verified');
  const seedTotal = Object.values(pool.seed_picks || {}).reduce((a, b) => a + Number(b), 0);
  return (pool.base_pot || 0) + verified.length * per;
}

function countsOf(pool) {
  const counts = { ...(pool.seed_picks || {}) };
  _entries.filter(e => e.pool_id === pool.id && e.payment_status === 'verified')
    .forEach(e => { counts[e.champion_pick] = (counts[e.champion_pick] || 0) + 1; });
  return counts;
}

// ── Router principal ──────────────────────────────────────────────────────
function renderApp() {
  const el = document.getElementById('q-app');
  if (!Auth.isLoggedIn()) {
    el.innerHTML = `
      <div class="q-card" style="text-align:center;">
        <h3 style="justify-content:center;">Inicia sesión para participar</h3>
        <p style="color:var(--text-dim);font-size:13px;margin-bottom:16px;">Necesitas una cuenta gratuita para entrar a las quinielas.</p>
        <button class="btn-full btn-blue-full" onclick="location.href='index.html'">Crear cuenta / Entrar</button>
      </div>${renderPoolList(true)}`;
    return;
  }
  if (_selectedPool) { renderPoolDetail(el); return; }
  el.innerHTML = renderPoolList(false);
}

function renderPoolList(readonly) {
  return `
    <div style="font-size:12px;color:var(--text-dim);margin:4px 0 10px;font-weight:600;letter-spacing:.5px;">ELIGE TU QUINIELA</div>
    ${_pools.map(p => {
      const mine = _myEntries.find(e => e.pool_id === p.id);
      const tag = mine ? `<span class="status-pill status-${mine.payment_status}" style="font-size:10px;padding:3px 8px;">${mine.payment_status==='verified'?'✓ Inscrito':mine.payment_status==='pending'?'⏳ Pendiente':'✕ Rechazado'}</span>` : '';
      return `
      <div class="pool-card" onclick="${readonly ? "location.href='index.html'" : `openPool(${p.id})`}">
        <div>
          <div class="pool-name">${p.name}</div>
          <div class="pool-sub">Boleto ${money(p.entry_amount, p.currency)} · ${p.status === 'open' ? 'Abierta' : p.status === 'settled' ? 'Finalizada' : 'Cerrada'} ${tag}</div>
        </div>
        <div class="pool-pot">
          <div class="pool-pot-val">${money(potOf(p), p.currency)}</div>
          <div class="pool-pot-lbl">BOTE</div>
        </div>
      </div>`;
    }).join('')}`;
}

function openPool(id) {
  _selectedPool = _pools.find(p => p.id === id);
  _pickedChampion = null; _payMethod = 'nat';
  renderApp();
}
function backToPools() { _selectedPool = null; renderApp(); }

function renderPoolDetail(el) {
  const p = _selectedPool;
  const mine = _myEntries.find(e => e.pool_id === p.id);

  let body;
  if (p.status === 'settled') body = renderSettled(p);
  else if (mine) body = renderMyEntry(p, mine);
  else if (p.status === 'closed') body = `<div class="q-card" style="text-align:center;"><h3 style="justify-content:center;">Inscripciones cerradas</h3><p style="color:var(--text-dim);font-size:13px;">Esta quiniela ya no acepta boletos.</p></div>`;
  else body = renderJoinForm(p);

  el.innerHTML = `
    <a class="back-link" onclick="backToPools()" style="cursor:pointer;">← Otras quinielas</a>
    <div class="q-hero" style="padding:18px;margin-bottom:14px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:1px;">${p.name}</div>
      <div style="display:flex;justify-content:center;gap:18px;margin-top:8px;">
        <div><div style="font-family:'Bebas Neue';font-size:24px;color:var(--orange);line-height:1;">${money(potOf(p), p.currency)}</div><div style="font-size:9px;color:var(--text-muted);">BOTE</div></div>
        <div><div style="font-family:'Bebas Neue';font-size:24px;color:var(--blue);line-height:1;">${_entries.filter(e=>e.pool_id===p.id&&e.payment_status==='verified').length}</div><div style="font-size:9px;color:var(--text-muted);">JUGADORES</div></div>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:8px;">Boleto ${money(p.entry_amount,p.currency)} · Comisión ${money(p.service_fee,p.currency)} · Al bote ${money(p.entry_amount-p.service_fee,p.currency)}</div>
    </div>
    ${body}
    ${renderBounty(p)}`;
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
      <h3><span class="num">2</span> Paga ${money(p.entry_amount, p.currency)} por Revolut</h3>
      <div class="pay-method">
        <div class="pay-opt sel" id="pm-nat" onclick="setPay('nat')">🇲🇽 Transferencia nacional</div>
        <div class="pay-opt" id="pm-intl" onclick="setPay('intl')">🌎 Internacional (SWIFT)</div>
      </div>

      <div id="pay-nat">
        <div class="bank-info">
          <div><strong>Banco:</strong> ${_pay.nat_bank || '—'}</div>
          <div><strong>Beneficiario:</strong> ${_pay.nat_holder || '—'}</div>
          <div><strong>CLABE:</strong> <span class="mono" id="clabe-val">${_pay.nat_clabe || '—'}</span>
            <button class="copy-btn" onclick="copyTxt('${_pay.nat_clabe}')">Copiar</button></div>
          <div><strong>Monto exacto:</strong> ${money(p.entry_amount, p.currency)}</div>
        </div>
      </div>

      <div id="pay-intl" style="display:none;">
        <div class="bank-info">
          <div><strong>Banco:</strong> ${_pay.intl_bank || '—'}</div>
          <div><strong>Beneficiario:</strong> ${_pay.intl_holder || '—'}</div>
          <div><strong>N.º de cuenta:</strong> <span class="mono">${_pay.intl_account || '—'}</span>
            <button class="copy-btn" onclick="copyTxt('${_pay.intl_account}')">Copiar</button></div>
          <div><strong>BIC/SWIFT:</strong> <span class="mono">${_pay.intl_swift || '—'}</span>
            <button class="copy-btn" onclick="copyTxt('${_pay.intl_swift}')">Copiar</button></div>
          <div style="font-size:11px;color:var(--text-muted);">${_pay.intl_address || ''}</div>
          <div><strong>Monto exacto:</strong> ${money(p.entry_amount, p.currency)}</div>
        </div>
      </div>

      ${_pay.revolut_referral ? `
      <div class="revolut-cta">
        <div style="font-size:13px;font-weight:700;">💳 ¿Aún no tienes Revolut?</div>
        <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">Únete a los más de 75 millones de clientes. Ábrela gratis y transfiere en segundos.</div>
        <a href="${_pay.revolut_referral}" target="_blank" rel="noopener">Crear cuenta Revolut →</a>
      </div>` : ''}

      <label class="form-label">Folio / referencia de tu transferencia</label>
      <input class="form-input" type="text" id="pay-ref" placeholder="Ej. Revolut REF 0123456789">
      <p style="font-size:11px;color:var(--text-muted);margin-top:8px;">📸 Tras transferir, ingresa el folio. Verificamos tu pago en <strong>menos de 5 minutos</strong> y te confirmamos por correo. Guarda tu comprobante / captura.</p>
    </div>

    <div class="q-card">
      <h3><span class="num">3</span> Confirmar</h3>
      <div style="font-size:13px;color:var(--text-dim);line-height:1.9;margin-bottom:14px;">
        <div>Campeón elegido: <strong id="conf-team" style="color:var(--orange);">—</strong></div>
        <div>Boleto: <strong>${money(p.entry_amount, p.currency)}</strong> (incluye ${money(p.service_fee, p.currency)} de comisión)</div>
        <div>Tu aporte al bote: <strong>${money(p.entry_amount - p.service_fee, p.currency)}</strong></div>
      </div>
      <label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--text-dim);margin-bottom:14px;cursor:pointer;">
        <input type="checkbox" id="accept-terms" style="margin-top:3px;">
        <span>Soy mayor de edad y acepto el <a href="pages/reglamento-quiniela.html" target="_blank" style="color:var(--blue);">Reglamento</a>. La comisión no es reembolsable; el bote se reparte entre quienes acierten al campeón.</span>
      </label>
      <button class="btn-full btn-orange" id="join-btn" style="background:var(--orange);color:#fff;" onclick="submitEntry()">Confirmar mi boleto</button>
      <div class="form-error" id="join-error"></div>
    </div>`;
}

function pickChampion(name, elx) {
  _pickedChampion = name;
  document.querySelectorAll('.team-opt').forEach(t => t.classList.remove('sel'));
  elx.classList.add('sel');
  const c = document.getElementById('conf-team'); if (c) c.textContent = name;
}
function setPay(m) {
  _payMethod = m;
  document.getElementById('pm-nat').classList.toggle('sel', m === 'nat');
  document.getElementById('pm-intl').classList.toggle('sel', m === 'intl');
  document.getElementById('pay-nat').style.display = m === 'nat' ? 'block' : 'none';
  document.getElementById('pay-intl').style.display = m === 'intl' ? 'block' : 'none';
}
function copyTxt(t) { navigator.clipboard?.writeText(t); _showToast('Copiado', 'var(--green)'); }

async function submitEntry() {
  const err = document.getElementById('join-error'); err.textContent = '';
  const p = _selectedPool;
  if (!_pickedChampion) { err.textContent = 'Elige un campeón.'; return; }
  if (!document.getElementById('accept-terms').checked) { err.textContent = 'Debes aceptar el reglamento.'; return; }
  const ref = document.getElementById('pay-ref').value.trim();
  if (!ref) { err.textContent = 'Ingresa el folio de tu transferencia.'; return; }

  const user = Auth.getUser();
  const btn = document.getElementById('join-btn');
  btn.textContent = 'Registrando...'; btn.disabled = true;

  const { error } = await sb.from('quiniela_entries').insert({
    user_id: user.id, pool_id: p.id, user_name: user.name, email: user.email,
    champion_pick: _pickedChampion,
    tiebreak_goals: parseInt(document.getElementById('tiebreak').value) || 0,
    amount: p.entry_amount, fee: p.service_fee, pool_contribution: p.entry_amount - p.service_fee,
    payment_method: _payMethod === 'intl' ? 'transfer_intl' : 'transfer_nat',
    payment_ref: ref, payment_status: 'pending',
  });

  btn.textContent = 'Confirmar mi boleto'; btn.disabled = false;
  if (error) { err.textContent = error.message.includes('duplicate') ? 'Ya tienes un boleto en esta quiniela.' : 'Error: ' + error.message; return; }

  _showToast('¡Boleto registrado!', 'var(--green)');
  await loadAll();
  _selectedPool = _pools.find(x => x.id === p.id);
  renderApp();
}

function renderMyEntry(p, e) {
  const team = Q_TEAMS.find(t => t.name === e.champion_pick);
  const sm = {
    pending:  { c:'status-pending',  t:'⏳ Verificando tu pago' },
    verified: { c:'status-verified', t:'✓ Boleto confirmado' },
    rejected: { c:'status-rejected', t:'✕ Pago rechazado' },
  }[e.payment_status];
  return `
    ${e.payment_status === 'pending' ? `
    <div class="confirm-box" style="margin-bottom:14px;">
      <div style="font-size:14px;font-weight:700;color:var(--green);">✓ ¡Quedaste registrado!</div>
      <div style="font-size:12px;color:var(--text-dim);margin-top:4px;">Verificamos tu pago en <strong>menos de 5 minutos</strong>. Te confirmaremos por correo a ${e.email || 'tu correo'}.</div>
    </div>` : ''}
    <div class="q-card" style="text-align:center;">
      <div style="font-size:46px;">${team ? team.flag : '🏆'}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px;">${e.champion_pick}</div>
      <p style="color:var(--text-dim);font-size:12px;margin:4px 0 12px;">Tu pronóstico de campeón</p>
      <div class="status-pill ${sm.c}">${sm.t}</div>
      ${e.payment_status === 'pending' ? `<p style="font-size:11px;color:var(--text-muted);margin-top:10px;">Folio: ${e.payment_ref || '—'}</p>` : ''}
    </div>`;
}

function renderBounty(p) {
  const counts = countsOf(p);
  const total = potOf(p);
  const myTeam = (_myEntries.find(e => e.pool_id === p.id) || {}).champion_pick;
  const teams = Object.keys(counts).sort((a,b) => {
    if (a === myTeam) return -1; if (b === myTeam) return 1; return counts[b] - counts[a];
  });
  if (!teams.length) return '';
  return `
    <div class="q-card">
      <h3>🏆 Reparto del bote</h3>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">Si tu equipo es campeón, el bote (${money(total,p.currency)}) se divide entre quienes lo eligieron:</div>
      ${teams.map(team => {
        const t = Q_TEAMS.find(x => x.name === team);
        const n = counts[team];
        return `<div class="bounty-row ${team===myTeam?'mine':''}">
          <span style="font-size:22px;">${t ? t.flag : '🏳️'}</span>
          <div style="flex:1;"><div style="font-size:13px;font-weight:700;">${team} ${team===myTeam?'· <span style="color:var(--orange)">tu equipo</span>':''}</div>
          <div style="font-size:10px;color:var(--text-dim);">${n} ${n===1?'jugador':'jugadores'}</div></div>
          <div style="text-align:right;"><div class="bounty-amt">${money(total/n,p.currency)}</div><div style="font-size:9px;color:var(--text-muted);">c/u si gana</div></div>
        </div>`;
      }).join('')}
    </div>`;
}

function renderSettled(p) {
  const champ = p.result_champion;
  const counts = countsOf(p);
  const total = potOf(p);
  const nWin = counts[champ] || 0;
  const per = nWin ? total / nWin : 0;
  const team = Q_TEAMS.find(t => t.name === champ);
  const mine = _myEntries.find(e => e.pool_id === p.id);
  const iWon = mine && mine.payment_status === 'verified' && mine.champion_pick === champ;
  return `
    <div class="q-card" style="text-align:center;">
      <div style="font-size:46px;">${team ? team.flag : '🏆'}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:var(--orange);">${champ} CAMPEÓN</div>
      <div style="margin:14px 0;padding:16px;background:var(--surface-2);border-radius:12px;">
        <div style="font-size:13px;color:var(--text-dim);">Bote: <strong>${money(total,p.currency)}</strong> · Ganadores: <strong>${nWin}</strong></div>
        <div style="font-family:'Bebas Neue';font-size:32px;color:var(--green);margin-top:6px;">${money(per,p.currency)}</div>
        <div style="font-size:11px;color:var(--text-muted);">por ganador</div>
      </div>
      ${iWon ? `<div class="status-pill status-verified" style="font-size:14px;">🎉 ¡Ganaste! Te contactaremos para tu pago.</div>` : (mine ? `<p style="color:var(--text-dim);font-size:13px;">No acertaste esta vez. ¡Suerte en la próxima!</p>` : '')}
    </div>`;
}

function _showToast(msg, color = 'var(--surface-3)') {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.style.borderColor = color;
  t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000);
}
