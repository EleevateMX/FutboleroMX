// ── TVContigo — Quiniela Mundialista ──────────────────────────────────────

// Selecciones candidatas al título (reales del Mundial 2026)
const Q_TEAMS = [
  { name:'Argentina', flag:'🇦🇷' }, { name:'Brasil', flag:'🇧🇷' }, { name:'Francia', flag:'🇫🇷' },
  { name:'España', flag:'🇪🇸' }, { name:'Inglaterra', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' }, { name:'Alemania', flag:'🇩🇪' },
  { name:'Portugal', flag:'🇵🇹' }, { name:'Países Bajos', flag:'🇳🇱' }, { name:'México', flag:'🇲🇽' },
  { name:'EE.UU.', flag:'🇺🇸' }, { name:'Bélgica', flag:'🇧🇪' }, { name:'Uruguay', flag:'🇺🇾' },
  { name:'Croacia', flag:'🇭🇷' }, { name:'Colombia', flag:'🇨🇴' }, { name:'Marruecos', flag:'🇲🇦' },
  { name:'Japón', flag:'🇯🇵' },
];

let _pool = null;
let _entries = [];
let _myEntry = null;
let _pickedChampion = null;
let _payMethod = 'transfer';

document.addEventListener('DOMContentLoaded', async () => {
  await authInit();
  await loadQuiniela();
});

async function loadQuiniela() {
  const [{ data: pool }, { data: entries }] = await Promise.all([
    sb.from('quiniela_pool').select('*').eq('id', 1).single(),
    sb.from('quiniela_entries').select('user_id, user_name, champion_pick, payment_status').order('created_at'),
  ]);
  _pool = pool || {};
  _entries = entries || [];

  // Mi boleto completo (con folio) — consulta filtrada por mi user_id
  const user = Auth.getUser();
  if (user) {
    const { data: mine } = await sb.from('quiniela_entries').select('*').eq('user_id', user.id).maybeSingle();
    _myEntry = mine || null;
  } else {
    _myEntry = null;
  }

  renderPotHeader();
  renderContent();
}

function money(n) {
  const cur = _pool.currency || 'MXN';
  return `$${Number(n).toLocaleString('es-MX')} ${cur}`;
}

function renderPotHeader() {
  const entry = _pool.entry_amount ?? 100;
  const fee = _pool.service_fee ?? 20;
  const pool = entry - fee;
  const base = _pool.base_pot ?? 1000;
  const verified = _entries.filter(e => e.payment_status === 'verified');
  const total = base + verified.length * pool;

  document.getElementById('q-name').textContent = _pool.name || 'Quiniela Mundialista 2026';
  document.getElementById('q-entry').textContent = money(entry);
  document.getElementById('q-fee').textContent = money(fee);
  document.getElementById('q-pool').textContent = money(pool);
  document.getElementById('pot-total').textContent = money(total);
  document.getElementById('pot-players').textContent = verified.length;
}

function renderContent() {
  const el = document.getElementById('q-content');
  const user = Auth.getUser();

  // No logueado
  if (!user) {
    el.innerHTML = `
      <div class="q-card" style="text-align:center;">
        <h3 style="justify-content:center;">Inicia sesión para participar</h3>
        <p style="color:var(--text-dim);font-size:13px;margin-bottom:16px;">Necesitas una cuenta gratuita para entrar a la quiniela.</p>
        <button class="btn-full btn-blue-full" onclick="location.href='index.html'">Crear cuenta / Entrar</button>
      </div>`;
    return;
  }

  // Quiniela cerrada o liquidada
  if (_pool.status === 'settled') { renderSettled(el); return; }
  if (_pool.status === 'closed' && !_myEntry) {
    el.innerHTML = `<div class="q-card" style="text-align:center;"><h3 style="justify-content:center;">Inscripciones cerradas</h3><p style="color:var(--text-dim);font-size:13px;">La quiniela ya no acepta nuevos boletos. ¡Suerte a los participantes!</p></div>`;
    return;
  }

  // Ya tiene boleto
  if (_myEntry) { renderMyEntry(el); return; }

  // Formulario de inscripción
  renderJoinForm(el);
}

function renderJoinForm(el) {
  const entry = _pool.entry_amount ?? 100;
  const fee = _pool.service_fee ?? 20;
  const pool = entry - fee;

  el.innerHTML = `
    <div class="q-card">
      <h3><span class="num">1</span> ¿Quién será el campeón?</h3>
      <div class="team-grid" id="team-grid">
        ${Q_TEAMS.map(t => `
          <div class="team-opt" onclick="pickChampion('${t.name}', this)">
            <span class="f">${t.flag}</span>${t.name}
          </div>`).join('')}
      </div>
      <div style="margin-top:14px;">
        <label class="form-label">Desempate: goles totales del campeón en el torneo</label>
        <input class="form-input" type="number" id="tiebreak" min="0" max="50" placeholder="Ej. 14" value="12">
      </div>
    </div>

    <div class="q-card">
      <h3><span class="num">2</span> Método de pago</h3>
      <div class="pay-method">
        <div class="pay-opt sel" id="pm-transfer" onclick="setPay('transfer')">🏦 Transferencia SPEI</div>
        ${_pool.payment_link ? `<div class="pay-opt" id="pm-link" onclick="setPay('link')">💳 Pago en línea</div>` : ''}
      </div>

      <div id="pay-transfer">
        <div class="bank-info">
          <div><strong>Banco:</strong> ${_pool.bank_name || '—'}</div>
          <div><strong>Titular:</strong> ${_pool.bank_holder || '—'}</div>
          <div><strong>CLABE:</strong> <span class="clabe" id="clabe-val">${_pool.bank_clabe || '—'}</span>
            <button class="copy-btn" onclick="copyClabe()">Copiar</button></div>
          <div><strong>Monto:</strong> ${money(entry)}</div>
        </div>
        <label class="form-label">Número de referencia / folio de tu transferencia</label>
        <input class="form-input" type="text" id="pay-ref" placeholder="Ej. SPEI 0123456789">
        <p style="font-size:11px;color:var(--text-muted);margin-top:8px;">Tras transferir, ingresa el folio. Tu boleto quedará <strong>pendiente</strong> hasta que verifiquemos el pago (suele tardar pocas horas).</p>
      </div>

      ${_pool.payment_link ? `
      <div id="pay-link" style="display:none;">
        <p style="font-size:13px;color:var(--text-dim);margin-bottom:10px;">Paga ${money(entry)} en línea de forma segura:</p>
        <a href="${_pool.payment_link}" target="_blank" class="btn-full btn-blue-full" style="display:block;text-align:center;text-decoration:none;margin-bottom:10px;">Ir a la pasarela de pago →</a>
        <label class="form-label">Referencia / ID de la transacción</label>
        <input class="form-input" type="text" id="pay-ref-link" placeholder="ID del pago">
      </div>` : ''}
    </div>

    <div class="q-card">
      <h3><span class="num">3</span> Confirmar</h3>
      <div style="font-size:13px;color:var(--text-dim);line-height:1.9;margin-bottom:14px;">
        <div>Campeón elegido: <strong id="conf-team" style="color:var(--orange);">—</strong></div>
        <div>Boleto: <strong>${money(entry)}</strong> (incluye ${money(fee)} de comisión)</div>
        <div>Tu aporte al pozo: <strong>${money(pool)}</strong></div>
      </div>
      <label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;color:var(--text-dim);margin-bottom:14px;cursor:pointer;">
        <input type="checkbox" id="accept-terms" style="margin-top:3px;">
        <span>Soy mayor de edad y acepto el <a href="pages/reglamento-quiniela.html" target="_blank" style="color:var(--blue);">Reglamento</a>. Entiendo que $${fee} es comisión de servicio no reembolsable y que el pozo se reparte entre quienes acierten al campeón.</span>
      </label>
      <button class="btn-full btn-orange" id="join-btn" style="background:var(--orange);color:#fff;" onclick="submitEntry()">Confirmar mi boleto</button>
      <div class="form-error" id="join-error"></div>
    </div>`;
}

function pickChampion(name, elx) {
  _pickedChampion = name;
  document.querySelectorAll('.team-opt').forEach(t => t.classList.remove('sel'));
  elx.classList.add('sel');
  const conf = document.getElementById('conf-team');
  if (conf) conf.textContent = name;
}

function setPay(m) {
  _payMethod = m;
  document.getElementById('pm-transfer').classList.toggle('sel', m === 'transfer');
  const pl = document.getElementById('pm-link');
  if (pl) pl.classList.toggle('sel', m === 'link');
  document.getElementById('pay-transfer').style.display = m === 'transfer' ? 'block' : 'none';
  const plv = document.getElementById('pay-link');
  if (plv) plv.style.display = m === 'link' ? 'block' : 'none';
}

function copyClabe() {
  const c = _pool.bank_clabe || '';
  navigator.clipboard?.writeText(c);
  _showToast('CLABE copiada', 'var(--green)');
}

async function submitEntry() {
  const err = document.getElementById('join-error');
  err.textContent = '';

  if (!_pickedChampion) { err.textContent = 'Elige un campeón.'; return; }
  if (!document.getElementById('accept-terms').checked) { err.textContent = 'Debes aceptar el reglamento.'; return; }

  const ref = _payMethod === 'transfer'
    ? document.getElementById('pay-ref').value.trim()
    : (document.getElementById('pay-ref-link')?.value.trim() || '');
  if (!ref) { err.textContent = 'Ingresa la referencia de tu pago.'; return; }

  const user = Auth.getUser();
  const entry = _pool.entry_amount ?? 100;
  const fee = _pool.service_fee ?? 20;
  const btn = document.getElementById('join-btn');
  btn.textContent = 'Registrando...'; btn.disabled = true;

  const { error } = await sb.from('quiniela_entries').insert({
    user_id: user.id,
    user_name: user.name,
    champion_pick: _pickedChampion,
    tiebreak_goals: parseInt(document.getElementById('tiebreak').value) || 0,
    amount: entry, fee, pool_contribution: entry - fee,
    payment_method: _payMethod,
    payment_ref: ref,
    payment_status: 'pending',
  });

  btn.textContent = 'Confirmar mi boleto'; btn.disabled = false;
  if (error) { err.textContent = 'Error: ' + error.message; return; }

  _showToast('¡Boleto registrado! Verificaremos tu pago.', 'var(--green)');
  await loadQuiniela();
}

function renderMyEntry(el) {
  const e = _myEntry;
  const statusMap = {
    pending:  { cls:'status-pending',  txt:'⏳ Pago pendiente de verificar' },
    verified: { cls:'status-verified', txt:'✓ Boleto confirmado' },
    rejected: { cls:'status-rejected', txt:'✕ Pago rechazado' },
  };
  const s = statusMap[e.payment_status] || statusMap.pending;
  const team = Q_TEAMS.find(t => t.name === e.champion_pick);

  el.innerHTML = `
    <div class="q-card" style="text-align:center;">
      <h3 style="justify-content:center;">Tu boleto</h3>
      <div style="font-size:48px;">${team ? team.flag : '🏆'}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:1px;">${e.champion_pick}</div>
      <p style="color:var(--text-dim);font-size:12px;margin:6px 0 14px;">Tu pronóstico de campeón del Mundial 2026</p>
      <div class="status-pill ${s.cls}">${s.txt}</div>
      ${e.payment_status === 'rejected' ? `<p style="font-size:12px;color:var(--red);margin-top:12px;">Contacta a soporte si crees que es un error.</p>` : ''}
      ${e.payment_status === 'pending' ? `<p style="font-size:12px;color:var(--text-muted);margin-top:12px;">Folio registrado: ${e.payment_ref || '—'}</p>` : ''}
    </div>
    <div class="q-card">
      <h3>Participantes (${_entries.filter(x=>x.payment_status==='verified').length})</h3>
      ${renderParticipants()}
    </div>`;
}

function renderParticipants() {
  const verified = _entries.filter(e => e.payment_status === 'verified');
  if (!verified.length) return `<p style="color:var(--text-dim);font-size:13px;">Aún no hay boletos confirmados.</p>`;
  // Conteo por equipo
  const counts = {};
  verified.forEach(e => { counts[e.champion_pick] = (counts[e.champion_pick] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  return `<div style="display:flex;flex-direction:column;gap:6px;">
    ${sorted.map(([team, n]) => {
      const t = Q_TEAMS.find(x => x.name === team);
      return `<div style="display:flex;align-items:center;gap:8px;font-size:13px;">
        <span style="font-size:18px;">${t ? t.flag : '🏳️'}</span>
        <span style="flex:1;">${team}</span>
        <strong style="color:var(--blue);">${n} ${n===1?'boleto':'boletos'}</strong>
      </div>`;
    }).join('')}
  </div>`;
}

function renderSettled(el) {
  const champ = _pool.result_champion;
  const verified = _entries.filter(e => e.payment_status === 'verified');
  const winners = verified.filter(e => e.champion_pick === champ);
  const pool = (_pool.entry_amount - _pool.service_fee);
  const base = _pool.base_pot ?? 1000;
  const total = base + verified.length * pool;
  const perWinner = winners.length ? total / winners.length : 0;
  const user = Auth.getUser();
  const iWon = user && winners.some(w => w.user_id === user.id);
  const team = Q_TEAMS.find(t => t.name === champ);

  el.innerHTML = `
    <div class="q-card" style="text-align:center;">
      <h3 style="justify-content:center;">🏆 Quiniela finalizada</h3>
      <div style="font-size:48px;">${team ? team.flag : '🏆'}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;color:var(--orange);">${champ} CAMPEÓN</div>
      <div style="margin:16px 0;padding:16px;background:var(--surface-2);border-radius:12px;">
        <div style="font-size:13px;color:var(--text-dim);">Pozo total: <strong>${money(total)}</strong></div>
        <div style="font-size:13px;color:var(--text-dim);">Ganadores: <strong>${winners.length}</strong></div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--green);margin-top:8px;">${money(perWinner)}</div>
        <div style="font-size:11px;color:var(--text-muted);">por ganador</div>
      </div>
      ${iWon
        ? `<div class="status-pill status-verified" style="font-size:14px;">🎉 ¡Ganaste! Te contactaremos para tu pago.</div>`
        : (user && _myEntry ? `<p style="color:var(--text-dim);font-size:13px;">Esta vez no acertaste. ¡Suerte en la próxima!</p>` : '')}
    </div>`;
}

function _showToast(msg, color = 'var(--surface-3)') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.borderColor = color;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
