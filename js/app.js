// ── FutboleroMX — App ─────────────────────────────────────────────────────────
let triviaIdx = 0;
let activeChannelId = null;
let currentMatchChannels = [];

document.addEventListener('DOMContentLoaded', async () => {
  initCookieBanner();
  await authInit();
  renderHero();
  renderChannelsGrid();
  renderMatches();
  renderResults();
  renderRanking();
  renderOracle();
  renderLiveSidebar();
  renderTrivia();
  renderQuinielaSection();
  startTimers();
});

// ── COOKIE BANNER ─────────────────────────────────────────────────────────────
function initCookieBanner() {
  if (localStorage.getItem('fmx_cookies')) {
    document.getElementById('cookie-banner').classList.add('hidden');
  }
}
function acceptCookie() {
  localStorage.setItem('fmx_cookies', '1');
  document.getElementById('cookie-banner').classList.add('hidden');
}
function dismissCookie() {
  document.getElementById('cookie-banner').classList.add('hidden');
}

// ── NAV HELPERS ───────────────────────────────────────────────────────────────
async function logout() { await Auth.logout(); }

function scrollToChannels() {
  document.getElementById('all-channels').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function scrollToQuiniela() {
  if (!Auth.isLoggedIn()) { openRegister(); return; }
  document.getElementById('quiniela-section').scrollIntoView({ behavior: 'smooth' });
}

// ── HERO ──────────────────────────────────────────────────────────────────────
function renderHero() {
  const m = MATCHES.find(m => m.status === 'live');
  if (!m) {
    // No live match — show next upcoming
    const next = MATCHES.find(m => m.status === 'upcoming');
    if (!next) return;
    document.getElementById('hero-card').innerHTML = `
      <div class="hero-meta">
        <span class="badge-comp">${next.competition}</span>
        <span class="hero-venue">📍 ${next.venue}</span>
      </div>
      <div class="match-teams">
        <div class="team"><div class="team-flag">${next.home.flag}</div><div class="team-name">${next.home.name}</div></div>
        <div class="match-score">
          <div class="score-nums" style="font-size:40px;color:var(--text-2)">${next.time}</div>
          <div class="score-min" style="color:var(--text-3)">PRÓXIMO</div>
        </div>
        <div class="team"><div class="team-flag">${next.away.flag}</div><div class="team-name">${next.away.name}</div></div>
      </div>
      <div class="hero-actions">
        <button class="btn-predict" onclick="scrollToQuiniela()">⚡ Pronosticar</button>
      </div>`;
    return;
  }
  document.getElementById('hero-card').innerHTML = `
    <div class="hero-meta">
      <span class="badge-live"><span class="pulse"></span>EN VIVO</span>
      <span class="badge-comp">${m.competition}</span>
      <span class="hero-venue">📍 ${m.venue}</span>
    </div>
    <div class="match-teams">
      <div class="team"><div class="team-flag">${m.home.flag}</div><div class="team-name">${m.home.name}</div></div>
      <div class="match-score">
        <div class="score-nums" id="hero-score">${m.home.score} · ${m.away.score}</div>
        <div class="score-min" id="hero-min">⏱ ${m.minute}'</div>
      </div>
      <div class="team"><div class="team-flag">${m.away.flag}</div><div class="team-name">${m.away.name}</div></div>
    </div>
    <div class="hero-actions">
      <button class="btn-watch" onclick="watchMatch(${m.id})">▶ Ver en vivo</button>
      <button class="btn-predict" onclick="scrollToQuiniela()">⚡ Pronosticar</button>
    </div>`;
}

// ── CHANNELS GRID ─────────────────────────────────────────────────────────────
function renderChannelsGrid() {
  document.getElementById('channels-grid').innerHTML = CHANNELS.map(ch => `
    <div class="ch-card" id="ch-${ch.id}" onclick="playChannel('${ch.id}')" role="button" aria-label="${ch.name} opción ${ch.option}">
      <div class="ch-icon">${ch.icon}</div>
      <div class="ch-name">${ch.name}</div>
      <div class="ch-sub">${ch.sub}</div>
      ${ch.option > 1 ? `<span class="ch-option">Opción ${ch.option}</span>` : ''}
      ${ch.free ? '<span class="badge-free">GRATIS</span>' : ''}
    </div>`).join('');
}

// ── PLAYER ────────────────────────────────────────────────────────────────────
function playChannel(id) {
  const ch = CHANNELS.find(c => c.id === id);
  if (!ch) return;
  document.querySelectorAll('.ch-card').forEach(c => c.classList.remove('playing'));
  document.getElementById('ch-' + id)?.classList.add('playing');
  document.querySelectorAll('.ch-selector-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.chId === id)
  );
  activeChannelId = id;
  const player = document.getElementById('player');
  player.classList.add('active');
  document.getElementById('player-label-text').textContent =
    `${ch.name}${ch.option > 1 ? ' — Opción ' + ch.option : ''} · EN VIVO`;
  document.getElementById('player-frame').src = ch.embedUrl;
  player.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closePlayer() {
  document.getElementById('player').classList.remove('active');
  document.getElementById('player-frame').src = '';
  document.getElementById('live-channel-selector').style.display = 'none';
  document.querySelectorAll('.ch-card').forEach(c => c.classList.remove('playing'));
  document.querySelectorAll('.ch-selector-tab').forEach(t => t.classList.remove('active'));
  activeChannelId = null;
  currentMatchChannels = [];
}

// ── WATCH MATCH (selector estilo lacancha.tv) ─────────────────────────────────
function watchMatch(matchId) {
  const m = MATCHES.find(x => x.id === matchId);
  if (!m) return;
  document.getElementById('ch-modal-match').textContent =
    `${m.home.flag} ${m.home.name}  vs  ${m.away.name} ${m.away.flag}`;
  document.getElementById('ch-modal-list').innerHTML = m.channels.map(cid => {
    const ch = CHANNELS.find(c => c.id === cid);
    if (!ch) return '';
    return `
      <div class="ch-modal-item" onclick="selectModalChannel('${ch.id}')" role="button">
        <span style="font-size:22px">${ch.icon}</span>
        <div style="flex:1">
          <div class="ch-modal-name">${ch.name}</div>
          <div class="ch-modal-desc">${ch.desc}</div>
        </div>
        ${ch.option > 1 ? `<span class="ch-modal-opt">Opción ${ch.option}</span>` : ''}
        ${ch.free ? '<span class="badge-free">GRATIS</span>' : ''}
      </div>`;
  }).join('');
  document.getElementById('ch-modal').classList.add('open');
}

function selectModalChannel(id) {
  closeChModal();
  const m = MATCHES.find(match => match.channels.includes(id));
  if (m) showSelectorTabs(m.channels, id);
  playChannel(id);
}

function showSelectorTabs(channelIds, activeId) {
  currentMatchChannels = channelIds;
  const selectorEl = document.getElementById('live-channel-selector');
  const tabsEl = document.getElementById('ch-selector-tabs');
  selectorEl.style.display = '';
  tabsEl.innerHTML = channelIds.map(cid => {
    const ch = CHANNELS.find(c => c.id === cid);
    if (!ch) return '';
    return `
      <button class="ch-selector-tab ${cid === activeId ? 'active' : ''}"
        data-ch-id="${cid}" onclick="playChannel('${cid}')">
        <div class="ch-logo">${ch.icon}</div>
        ${ch.name}
        ${ch.option > 1 ? `<span class="ch-option">Op.${ch.option}</span>` : ''}
      </button>`;
  }).join('');
}

function closeChModal() { document.getElementById('ch-modal').classList.remove('open'); }

// ── TABS ──────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab)
  );
  document.getElementById('tab-upcoming').style.display = tab === 'upcoming' ? '' : 'none';
  document.getElementById('tab-results').style.display  = tab === 'results'  ? '' : 'none';
}

// ── MATCHES ───────────────────────────────────────────────────────────────────
function renderMatches() {
  const list = MATCHES.filter(m => m.status !== 'finished');
  document.getElementById('matches-list').innerHTML = list.map(m => {
    const isLive = m.status === 'live';
    const timeEl = isLive
      ? `<span class="badge-live" style="font-size:10px"><span class="pulse"></span>${m.minute}'</span>`
      : `<span class="match-row-time">${m.time}</span>`;
    const scoreEl = isLive
      ? `<span class="match-row-score">${m.home.score} · ${m.away.score}</span>`
      : `<span class="match-row-score" style="color:var(--text-3)">vs</span>`;
    const pills = m.channels.slice(0, 3).map(id => {
      const ch = CHANNELS.find(c => c.id === id);
      return ch ? `<span class="ch-pill">${ch.name}${ch.option > 1 ? ' ' + ch.option : ''}</span>` : '';
    }).join('');
    return `
      <div class="match-row" onclick="watchMatch(${m.id})" role="button" aria-label="${m.home.name} vs ${m.away.name}">
        ${timeEl}
        <div class="match-row-teams">
          <strong>${m.home.name} ${m.home.flag}</strong>
          <span class="vs">vs</span>
          <strong>${m.away.flag} ${m.away.name}</strong>
        </div>
        ${scoreEl}
        <div class="ch-pills">${pills}</div>
      </div>`;
  }).join('');
}

// ── RESULTS ───────────────────────────────────────────────────────────────────
function renderResults() {
  document.getElementById('results-grid').innerHTML = RESULTS.map(r => `
    <div class="result-card">
      <div class="result-comp">${r.competition}</div>
      <div class="result-team ${r.winner === 'home' ? 'winner' : 'loser'}">
        <span>${r.home.flag} ${r.home.name}</span><span class="score">${r.home.score}</span>
      </div>
      <div class="result-team ${r.winner === 'away' ? 'winner' : r.winner === 'draw' ? '' : 'loser'}">
        <span>${r.away.flag} ${r.away.name}</span><span class="score">${r.away.score}</span>
      </div>
    </div>`).join('');
}

// ── RANKING ───────────────────────────────────────────────────────────────────
function renderRanking() {
  document.getElementById('ranking-list').innerHTML = RANKING.map(r => `
    <div class="rank-item">
      <span class="rank-pos">${r.medal || r.pos}</span>
      <div class="rank-avatar" style="color:${r.color}">${r.avatar}</div>
      <span class="rank-name">${r.name}</span>
      <span class="rank-pts">${r.pts} pts</span>
    </div>`).join('');
}

// ── ORACLE ────────────────────────────────────────────────────────────────────
function renderOracle() {
  const m = MATCHES.find(m => m.status === 'upcoming');
  if (!m) return;
  document.getElementById('oracle-box').innerHTML = `
    <div class="oracle-stat">
      <span>Precisión esta semana</span><strong>74% ✓</strong>
    </div>
    <div class="oracle-inner">
      <div class="oracle-match-name">${m.home.name} vs ${m.away.name} · ${m.time}</div>
      <div class="oracle-tip">El Oráculo predice: <strong>${m.home.name} gana</strong></div>
      <div class="oracle-btns">
        <button class="oracle-btn selected" onclick="pickOracle(this)">${m.home.flag}</button>
        <button class="oracle-btn" onclick="pickOracle(this)">X</button>
        <button class="oracle-btn" onclick="pickOracle(this)">${m.away.flag}</button>
      </div>
    </div>`;
}
function pickOracle(btn) {
  btn.closest('.oracle-btns').querySelectorAll('.oracle-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ── LIVE SIDEBAR ──────────────────────────────────────────────────────────────
function renderLiveSidebar() {
  const live = MATCHES.filter(m => m.status === 'live');
  const el = document.getElementById('live-sidebar');
  if (!live.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text-3);padding:4px 0">Sin partidos en vivo ahora.</p>';
    return;
  }
  el.innerHTML = live.map(m => `
    <div class="match-row" style="padding:9px 12px" onclick="watchMatch(${m.id})" role="button">
      <span class="badge-live" style="font-size:10px"><span class="pulse"></span>${m.minute}'</span>
      <div class="match-row-teams" style="font-size:12px">
        <strong>${m.home.name}</strong><span class="vs">vs</span><strong>${m.away.name}</strong>
      </div>
      <span class="match-row-score" style="font-size:14px">${m.home.score} · ${m.away.score}</span>
    </div>`).join('');
}

// ── TRIVIA ────────────────────────────────────────────────────────────────────
function renderTrivia() {
  const el = document.getElementById('trivia-text');
  if (!el) return;
  el.style.opacity = '0';
  el.style.transition = 'opacity .3s';
  setTimeout(() => { el.innerHTML = TRIVIA[triviaIdx]; el.style.opacity = '1'; }, 150);
}
function nextTrivia() {
  triviaIdx = (triviaIdx + 1) % TRIVIA.length;
  renderTrivia();
}

// ── QUINIELA ─────────────────────────────────────────────────────────────────
function renderQuinielaSection() {
  const el = document.getElementById('quiniela-section');
  if (!el) return;
  if (!Auth.isLoggedIn()) {
    el.innerHTML = `
      <div class="quiniela-cta">
        <h4>🏆 Mi Quiniela Mundial</h4>
        <p>Registrate gratis, predice los partidos del Mundial 2026 y sube al ranking semanal.</p>
        <button class="btn-quiniela" onclick="openRegister()">Crear cuenta gratis</button>
        <div style="margin-top:12px">
          <button onclick="openLogin()" style="background:none;border:none;color:var(--text-3);font-size:12px;cursor:pointer">
            ¿Ya tienes cuenta? Inicia sesión
          </button>
        </div>
      </div>`;
    return;
  }
  renderQuiniela();
}

function renderQuiniela() {
  const upcoming = MATCHES.filter(m => m.status === 'upcoming');
  const el = document.getElementById('quiniela-section');
  el.innerHTML = `
    <div class="section-header" style="margin-bottom:.875rem">
      <span class="section-title">🏆 Mi Quiniela Mundial</span>
      <span class="badge-gold">+3 pts por acierto</span>
    </div>
    <div class="quiniela-grid">
      ${upcoming.map(m => {
        const saved = Auth.getPick(m.id);
        return `
          <div class="quiniela-row" id="qrow-${m.id}">
            <span class="q-time">${m.time}</span>
            <div class="q-teams">
              ${m.home.flag} <strong>${m.home.name}</strong>
              <span class="q-vs">vs</span>
              <strong>${m.away.name}</strong> ${m.away.flag}
            </div>
            <div class="q-picks">
              <button class="q-pick ${saved === 'home' ? 'picked-home' : ''}" onclick="savePick(${m.id},'home',this)">${m.home.flag}</button>
              <button class="q-pick ${saved === 'draw' ? 'picked-draw' : ''}" onclick="savePick(${m.id},'draw',this)">X</button>
              <button class="q-pick ${saved === 'away' ? 'picked-away' : ''}" onclick="savePick(${m.id},'away',this)">${m.away.flag}</button>
            </div>
            <span class="q-pts" id="qpts-${m.id}">${saved ? '<strong>+3 pts</strong>' : '—'}</span>
          </div>`;
      }).join('')}
    </div>
    <button class="quiniela-submit" onclick="submitQuiniela()">💾 Guardar quiniela</button>`;
}

async function savePick(matchId, pick, btn) {
  const row = document.getElementById('qrow-' + matchId);
  row.querySelectorAll('.q-pick').forEach(b => b.className = 'q-pick');
  btn.classList.add(pick === 'home' ? 'picked-home' : pick === 'draw' ? 'picked-draw' : 'picked-away');
  await Auth.savePick(matchId, pick);
  document.getElementById('qpts-' + matchId).innerHTML = '<strong>+3 pts</strong>';
}

function submitQuiniela() {
  const btn = document.querySelector('.quiniela-submit');
  btn.textContent = '✅ ¡Quiniela guardada!';
  btn.style.background = '#16a34a';
  setTimeout(() => {
    btn.textContent = '💾 Guardar quiniela';
    btn.style.background = '';
  }, 2800);
}

// ── AUTH MODALS ───────────────────────────────────────────────────────────────
function openLogin()    { closeAll(); document.getElementById('modal-login').classList.add('open'); }
function openRegister() { closeAll(); document.getElementById('modal-register').classList.add('open'); }
function closeAll() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.form-error').forEach(e => { e.classList.remove('visible'); e.textContent = ''; });
}
function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('visible'); }
}

async function doLogin(e) {
  e.preventDefault();
  const btn      = e.submitter;
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (btn) { btn.disabled = true; btn.textContent = 'Entrando…'; }
  const result = await Auth.login(email, password);
  if (btn) { btn.disabled = false; btn.textContent = 'Iniciar sesión'; }
  if (!result.ok) { showError('login-error', result.msg); return; }
  closeAll();
}

async function doRegister(e) {
  e.preventDefault();
  const btn      = e.submitter;
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;
  if (!name) { showError('reg-error', 'Ingresa tu nombre.'); return; }
  if (password !== confirm) { showError('reg-error', 'Las contraseñas no coinciden.'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Creando cuenta…'; }
  const result = await Auth.register(name, email, password);
  if (btn) { btn.disabled = false; btn.textContent = 'Crear cuenta'; }
  if (!result.ok) { showError('reg-error', result.msg); return; }
  closeAll();
  _showToast('✅ ¡Cuenta creada! Revisa tu correo para confirmarla.', 'green');
}

function _showToast(msg, color = 'green') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    background:${color === 'green' ? '#16a34a' : '#ef4444'};color:#fff;
    padding:13px 24px;border-radius:12px;font-size:14px;font-weight:600;
    z-index:9999;box-shadow:0 4px 24px rgba(0,0,0,.45);white-space:nowrap`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

// Close on overlay click or Escape
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeAll();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeAll(); closeChModal(); }
});

// ── TIMERS ────────────────────────────────────────────────────────────────────
function startTimers() {
  setInterval(() => {
    MATCHES.forEach(m => { if (m.status === 'live' && m.minute < 90) m.minute++; });
    const live = MATCHES.find(m => m.status === 'live');
    if (live) {
      const el = document.getElementById('hero-min');
      if (el) el.textContent = `⏱ ${live.minute}'`;
    }
    renderLiveSidebar();
    renderMatches();
  }, 60000);
  setInterval(nextTrivia, 14000);
}
