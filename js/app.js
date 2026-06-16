// ── STATE ──
let triviaIdx = 0;

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  updateNav();
  renderHero();
  renderChannels();
  renderMatches();
  renderResults();
  renderRanking();
  renderOracle();
  renderLiveSidebar();
  renderTrivia();
  startTimers();
});

// ── NAV AUTH ──
function updateNav() {
  const user = Auth.getUser();
  const guestBtns = document.getElementById('nav-guest');
  const userArea  = document.getElementById('nav-user');
  if (user) {
    guestBtns.style.display = 'none';
    userArea.style.display  = 'flex';
    document.getElementById('nav-username').textContent = user.name;
    document.getElementById('nav-avatar').textContent   = user.name.slice(0,2).toUpperCase();
  } else {
    guestBtns.style.display = 'flex';
    userArea.style.display  = 'none';
  }
}

function logout() {
  Auth.logout();
  updateNav();
  renderQuinielaLock();
}

// ── HERO ──
function renderHero() {
  const m = MATCHES.find(m => m.status === 'live');
  if (!m) return;
  document.getElementById('hero-card').innerHTML = `
    <div class="hero-meta">
      <span class="badge-live"><span class="pulse"></span>EN VIVO</span>
      <span class="badge-comp">${m.competition}</span>
      <span class="hero-venue">📍 ${m.venue}</span>
    </div>
    <div class="match-teams">
      <div class="team">
        <div class="team-flag">${m.home.flag}</div>
        <div class="team-name">${m.home.name}</div>
      </div>
      <div class="match-score">
        <div class="score-nums" id="hero-score">${m.home.score} · ${m.away.score}</div>
        <div class="score-min" id="hero-min">${m.minute}'</div>
      </div>
      <div class="team">
        <div class="team-flag">${m.away.flag}</div>
        <div class="team-name">${m.away.name}</div>
      </div>
    </div>
    <div class="hero-actions">
      <button class="btn-watch" onclick="watchMatch(${m.id})">▶ Ver en vivo</button>
      <button class="btn-predict" onclick="scrollToQuiniela()">⚡ Pronosticar</button>
    </div>`;
}

// ── CHANNELS ──
function renderChannels() {
  document.getElementById('channels-grid').innerHTML = CHANNELS.map(ch => `
    <div class="ch-card" id="ch-${ch.id}" onclick="playChannel('${ch.id}')">
      <div class="ch-icon">${ch.icon}</div>
      <div class="ch-name">${ch.name}</div>
      <div class="ch-sub">${ch.sub}</div>
      ${ch.free ? '<span class="badge-free">GRATIS</span>' : ''}
    </div>`).join('');
}

function playChannel(id) {
  const ch = CHANNELS.find(c => c.id === id);
  if (!ch) return;
  document.querySelectorAll('.ch-card').forEach(c => c.classList.remove('playing'));
  document.getElementById('ch-' + id)?.classList.add('playing');
  const player = document.getElementById('player');
  player.classList.add('active');
  document.getElementById('player-label').textContent = '▶ ' + ch.name;
  document.getElementById('player-frame').src = getStreamUrl(ch);
  player.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closePlayer() {
  document.getElementById('player').classList.remove('active');
  document.getElementById('player-frame').src = '';
  document.querySelectorAll('.ch-card').forEach(c => c.classList.remove('playing'));
}

// ── MATCH WATCHER ──
function watchMatch(matchId) {
  const m = MATCHES.find(x => x.id === matchId);
  if (!m) return;
  const modal = document.getElementById('ch-modal');
  document.getElementById('ch-modal-match').textContent = `${m.home.flag} ${m.home.name} vs ${m.away.name} ${m.away.flag}`;
  document.getElementById('ch-modal-list').innerHTML = m.channels.map(cid => {
    const ch = CHANNELS.find(c => c.id === cid);
    if (!ch) return '';
    return `<div class="ch-modal-item" onclick="selectStream('${ch.id}')">
      <span style="font-size:20px">${ch.icon}</span>
      <div class="ch-modal-info">
        <div class="ch-modal-name">${ch.name}</div>
        <div class="ch-modal-desc">${ch.desc}</div>
      </div>
      ${ch.free ? '<span class="badge-free">GRATIS</span>' : ''}
    </div>`;
  }).join('');
  modal.classList.add('open');
}

function selectStream(id) {
  closeChModal();
  playChannel(id);
}
function closeChModal() { document.getElementById('ch-modal').classList.remove('open'); }

// ── TABS ──
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('tab-upcoming').style.display = tab === 'upcoming' ? '' : 'none';
  document.getElementById('tab-results').style.display  = tab === 'results'  ? '' : 'none';
}

// ── MATCHES ──
function renderMatches() {
  const list = MATCHES.filter(m => m.status !== 'finished');
  document.getElementById('matches-list').innerHTML = list.map(m => {
    const live  = m.status === 'live';
    const time  = live
      ? `<span class="badge-live" style="font-size:10px"><span class="pulse"></span>${m.minute}'</span>`
      : `<span class="match-row-time">${m.time}</span>`;
    const score = live
      ? `<span class="match-row-score">${m.home.score} · ${m.away.score}</span>`
      : `<span class="match-row-score" style="color:var(--text-muted)">vs</span>`;
    const pills = m.channels.slice(0,3).map(id => {
      const ch = CHANNELS.find(c => c.id === id);
      return ch ? `<span class="ch-pill">${ch.name}</span>` : '';
    }).join('');
    return `<div class="match-row" onclick="watchMatch(${m.id})">
      ${time}
      <div class="match-row-teams">
        <strong>${m.home.name} ${m.home.flag}</strong>
        <span class="vs">vs</span>
        <strong>${m.away.flag} ${m.away.name}</strong>
      </div>
      ${score}
      <div class="ch-pills">${pills}</div>
    </div>`;
  }).join('');
}

// ── RESULTS ──
function renderResults() {
  document.getElementById('results-grid').innerHTML = RESULTS.map(r => `
    <div class="result-card">
      <div class="result-comp">${r.competition}</div>
      <div class="result-team ${r.winner==='home'?'winner':'loser'}">
        <span>${r.home.flag} ${r.home.name}</span><span class="score">${r.home.score}</span>
      </div>
      <div class="result-team ${r.winner==='away'?'winner':'loser'}">
        <span>${r.away.flag} ${r.away.name}</span><span class="score">${r.away.score}</span>
      </div>
    </div>`).join('');
}

// ── RANKING ──
function renderRanking() {
  document.getElementById('ranking-list').innerHTML = RANKING.map(r => `
    <div class="rank-item">
      <span class="rank-pos">${r.medal || r.pos}</span>
      <div class="rank-avatar" style="color:${r.color}">${r.avatar}</div>
      <span class="rank-name">${r.name}</span>
      <span class="rank-pts">${r.pts} pts</span>
    </div>`).join('');
}

// ── ORACLE ──
function renderOracle() {
  const m = MATCHES.find(m => m.status === 'upcoming');
  if (!m) return;
  document.getElementById('oracle-box').innerHTML = `
    <div class="oracle-stat">
      <span>Precisión esta semana</span><strong>74%</strong>
    </div>
    <div class="oracle-box">
      <div class="oracle-match-name">${m.home.name} vs ${m.away.name} · ${m.time}</div>
      <div class="oracle-tip">El Oráculo predice: <strong>${m.home.name} gana</strong></div>
      <div class="oracle-btns">
        <button class="oracle-btn selected" onclick="pickOracle(this)">${m.home.flag}</button>
        <button class="oracle-btn" onclick="pickOracle(this)">Empate</button>
        <button class="oracle-btn" onclick="pickOracle(this)">${m.away.flag}</button>
      </div>
    </div>`;
}

function pickOracle(btn) {
  btn.closest('.oracle-btns').querySelectorAll('.oracle-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ── LIVE SIDEBAR ──
function renderLiveSidebar() {
  const live = MATCHES.filter(m => m.status === 'live');
  const el = document.getElementById('live-sidebar');
  if (!live.length) { el.innerHTML = '<p style="font-size:13px;color:var(--text-muted)">Sin partidos en vivo ahora.</p>'; return; }
  el.innerHTML = live.map(m => `
    <div class="match-row" style="padding:9px 12px" onclick="watchMatch(${m.id})">
      <span class="badge-live" style="font-size:10px"><span class="pulse"></span>${m.minute}'</span>
      <div class="match-row-teams" style="font-size:12px">
        <strong>${m.home.name}</strong><span class="vs">vs</span><strong>${m.away.name}</strong>
      </div>
      <span class="match-row-score" style="font-size:13px">${m.home.score} · ${m.away.score}</span>
    </div>`).join('');
}

// ── TRIVIA ──
function renderTrivia() {
  document.getElementById('trivia-text').innerHTML = TRIVIA[triviaIdx];
}
function nextTrivia() {
  triviaIdx = (triviaIdx + 1) % TRIVIA.length;
  renderTrivia();
}

// ── QUINIELA ──
function scrollToQuiniela() {
  const user = Auth.getUser();
  if (!user) { openLogin(); return; }
  document.getElementById('quiniela-section')?.scrollIntoView({ behavior: 'smooth' });
}

function renderQuinielaLock() {
  const user = Auth.getUser();
  const qSection = document.getElementById('quiniela-section');
  if (!qSection) return;
  if (!user) {
    qSection.innerHTML = `
      <div class="quiniela-cta">
        <h4>🏆 Mi Quiniela</h4>
        <p>Inicia sesión para guardar tus predicciones y acumular puntos en el ranking.</p>
        <button class="btn-quiniela" onclick="openRegister()">Crear cuenta gratis</button>
        <div style="margin-top:8px"><button onclick="openLogin()" style="background:none;border:none;color:var(--text-muted);font-size:12px;cursor:pointer;">¿Ya tienes cuenta? Inicia sesión</button></div>
      </div>`;
    return;
  }
  renderQuiniela();
}

function renderQuiniela() {
  const upcoming = MATCHES.filter(m => m.status === 'upcoming');
  const el = document.getElementById('quiniela-section');
  el.innerHTML = `
    <div class="section-header">
      <span class="section-title">🏆 Mi Quiniela</span>
      <span class="badge-gold">+3 pts por acierto</span>
    </div>
    <div class="quiniela-grid" id="quiniela-grid">
      ${upcoming.map(m => {
        const saved = Auth.getPick(m.id);
        return `<div class="quiniela-row" id="qrow-${m.id}">
          <span class="q-time">${m.time}</span>
          <div class="q-teams">
            ${m.home.flag} <strong>${m.home.name}</strong>
            <span class="q-vs">vs</span>
            <strong>${m.away.name}</strong> ${m.away.flag}
          </div>
          <div class="q-picks">
            <button class="q-pick ${saved==='home'?'picked-home':''}" onclick="savePick(${m.id},'home',this)">${m.home.flag}</button>
            <button class="q-pick ${saved==='draw'?'picked-draw':''}" onclick="savePick(${m.id},'draw',this)">X</button>
            <button class="q-pick ${saved==='away'?'picked-away':''}" onclick="savePick(${m.id},'away',this)">${m.away.flag}</button>
          </div>
          <span class="q-pts" id="qpts-${m.id}">${saved ? '<strong>+3 pts</strong>' : '— pts'}</span>
        </div>`;
      }).join('')}
    </div>
    <button class="quiniela-submit" onclick="submitQuiniela()">💾 Guardar quiniela</button>`;
}

function savePick(matchId, pick, btn) {
  const row = document.getElementById('qrow-' + matchId);
  row.querySelectorAll('.q-pick').forEach(b => b.className = 'q-pick');
  const cls = pick === 'home' ? 'picked-home' : pick === 'draw' ? 'picked-draw' : 'picked-away';
  btn.classList.add(cls);
  Auth.savePick(matchId, pick);
  document.getElementById('qpts-' + matchId).innerHTML = '<strong>+3 pts</strong>';
}

function submitQuiniela() {
  const btn = document.querySelector('.quiniela-submit');
  btn.textContent = '✅ ¡Quiniela guardada!';
  btn.style.background = '#16a34a';
  setTimeout(() => {
    btn.textContent = '💾 Guardar quiniela';
    btn.style.background = '';
  }, 2500);
}

// ── AUTH MODALS ──
function openLogin()    { closeAll(); document.getElementById('modal-login').classList.add('open'); }
function openRegister() { closeAll(); document.getElementById('modal-register').classList.add('open'); }
function closeAll() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  clearErrors();
}
function clearErrors() {
  document.querySelectorAll('.form-error').forEach(e => { e.classList.remove('visible'); e.textContent = ''; });
}
function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('visible'); }
}

function doLogin(e) {
  e.preventDefault();
  clearErrors();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const result   = Auth.login(email, password);
  if (!result.ok) { showError('login-error', result.msg); return; }
  closeAll();
  updateNav();
  renderQuinielaLock();
}

function doRegister(e) {
  e.preventDefault();
  clearErrors();
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;
  if (!name) { showError('reg-error', 'Ingresa tu nombre.'); return; }
  if (password !== confirm) { showError('reg-error', 'Las contraseñas no coinciden.'); return; }
  const result = Auth.register(name, email, password);
  if (!result.ok) { showError('reg-error', result.msg); return; }
  closeAll();
  updateNav();
  renderQuinielaLock();
}

// close on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeAll();
  if (e.target.id === 'ch-modal') closeChModal();
});

// ── TIMERS ──
function startTimers() {
  setInterval(() => {
    MATCHES.forEach(m => { if (m.status === 'live' && m.minute < 90) m.minute++; });
    const live = MATCHES.find(m => m.status === 'live');
    if (live) {
      const el = document.getElementById('hero-min');
      if (el) el.textContent = live.minute + "'";
    }
    renderLiveSidebar();
    renderMatches();
  }, 60000);

  // trivia rotation every 12s
  setInterval(nextTrivia, 12000);
}
