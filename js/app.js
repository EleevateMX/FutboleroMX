// ── TVContigo — App Logic ─────────────────────────────────────────────────

let _activeChannel = null;

document.addEventListener('DOMContentLoaded', async () => {
  await authInit();
  renderHero();
  renderChannelStrip();
  renderMatchesRow();
  renderChannelsGrid();
  renderResultsRow();
  renderTriviaRow();
  renderQuinielaSection();
  renderRanking();
  loadAdSettings();
});

// ── Hero ──────────────────────────────────────────────────────────────────
function renderHero() {
  const hero = document.getElementById('hero-section');
  const live = MATCHES.find(m => m.status === 'live');
  const next = MATCHES.find(m => m.status === 'upcoming');
  const match = live || next;

  if (!match) {
    hero.innerHTML = `
      <div class="hero-no-live">
        <div class="big-icon">📺</div>
        <h2>Sin partidos ahora</h2>
        <p>Próximamente más fútbol en vivo</p>
      </div>`;
    return;
  }

  const ch = CHANNELS.find(c => c.id === (match.defaultChannel || CHANNELS[0].id));
  _activeChannel = ch || CHANNELS[0];

  const isLive = match.status === 'live';

  hero.innerHTML = `
    <iframe src="${_activeChannel.url}" allowfullscreen allow="autoplay; fullscreen"
      style="width:100%;height:100%;border:none;display:block;"></iframe>
    <div class="hero-overlay"></div>
    <div class="hero-info">
      <div class="hero-meta">
        ${isLive ? `<div class="hero-live-badge"><span style="width:6px;height:6px;border-radius:50%;background:#fff;display:inline-block;"></span> EN VIVO</div>` : ''}
        <div class="hero-title">${match.home.flag} ${match.home.name} vs ${match.away.flag} ${match.away.name}</div>
        <div class="hero-subtitle">${match.competition} &nbsp;·&nbsp; ${isLive ? match.time : match.time + ' ' + (match.date || '')}</div>
      </div>
      <div class="hero-actions">
        <button class="btn-watch" onclick="scrollToSection('all-channels')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
          Cambiar canal
        </button>
      </div>
    </div>`;
}

// ── Channel Strip (quick selector) ───────────────────────────────────────
function renderChannelStrip() {
  const strip = document.getElementById('channel-strip');
  strip.innerHTML = CHANNELS.map((ch, i) => `
    <div class="channel-chip ${i === 0 ? 'active' : ''}" onclick="switchChannel('${ch.id}', this)">
      <span class="chip-name">${ch.name}</span>
      <span class="chip-label">${ch.option}</span>
      ${ch.live ? '<span class="chip-live">● EN VIVO</span>' : ''}
    </div>
  `).join('');
}

function switchChannel(channelId, el) {
  const ch = CHANNELS.find(c => c.id === channelId);
  if (!ch) return;
  _activeChannel = ch;

  document.querySelectorAll('.channel-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');

  const hero = document.getElementById('hero-section');
  const iframe = hero.querySelector('iframe');
  if (iframe) {
    iframe.src = ch.url;
  } else {
    renderHero();
    setTimeout(() => {
      const newIframe = hero.querySelector('iframe');
      if (newIframe) newIframe.src = ch.url;
    }, 50);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  _showToast(`📺 ${ch.name} ${ch.option} cargando...`, 'var(--blue)');
}

// ── Matches Row ───────────────────────────────────────────────────────────
function renderMatchesRow() {
  const row = document.getElementById('matches-row');
  row.innerHTML = MATCHES.map(m => {
    const isLive = m.status === 'live';
    return `
    <div class="match-card ${isLive ? 'live' : ''}" onclick="${isLive ? `switchChannel('${m.defaultChannel || 'telemundo-1'}', document.querySelector('.channel-chip'))` : ''}">
      <div class="mc-status ${isLive ? 'live' : 'upcoming'}">
        ${isLive ? '● EN VIVO' : '⏰ ' + (m.date || '') + ' ' + m.time}
      </div>
      <div class="mc-teams">
        <div class="mc-team">
          <div class="mc-flag">${m.home.flag}</div>
          <div class="mc-team-name">${m.home.name}</div>
        </div>
        <div class="mc-score-block">
          <div class="mc-score">${isLive ? m.score : 'vs'}</div>
          ${isLive ? `<div class="mc-time">${m.time}</div>` : ''}
        </div>
        <div class="mc-team">
          <div class="mc-flag">${m.away.flag}</div>
          <div class="mc-team-name">${m.away.name}</div>
        </div>
      </div>
      <div class="mc-competition">${m.competition}</div>
    </div>`;
  }).join('');
}

// ── Channels Grid ─────────────────────────────────────────────────────────
function renderChannelsGrid() {
  const grid = document.getElementById('channels-grid');
  grid.innerHTML = CHANNELS.map(ch => `
    <div class="ch-card" onclick="switchChannel('${ch.id}', document.querySelector('.channel-chip[onclick*=\\'${ch.id}\\']') || document.querySelector('.channel-chip'))">
      <div class="ch-name">${ch.name}</div>
      <div class="ch-option">${ch.option}</div>
      ${ch.live ? `<div class="ch-live-tag">
        <span style="width:6px;height:6px;background:var(--red);border-radius:50%;display:inline-block;"></span>
        EN VIVO
      </div>` : ''}
    </div>
  `).join('');
}

// ── Results Row ───────────────────────────────────────────────────────────
function renderResultsRow() {
  const row = document.getElementById('results-row');
  row.innerHTML = RESULTS.map(r => `
    <div class="result-card">
      <div class="rc-competition">${r.comp}</div>
      <div class="rc-row">
        <div class="rc-team">${r.home.flag} ${r.home.name}</div>
        <div class="rc-score">${r.score}</div>
        <div class="rc-team right">${r.away.name} ${r.away.flag}</div>
      </div>
    </div>
  `).join('');
}

// ── Trivia Row ────────────────────────────────────────────────────────────
function renderTriviaRow() {
  const row = document.getElementById('trivia-row');
  row.innerHTML = TRIVIA.map(t => `
    <div class="trivia-card">
      <div class="trivia-q">${t.q}</div>
      <div class="trivia-a">→ ${t.a}</div>
    </div>
  `).join('');
}

// ── Quiniela Section ──────────────────────────────────────────────────────
function renderQuinielaSection() {
  const container = document.getElementById('quiniela-container');
  if (!container) return;

  if (!Auth.isLoggedIn()) {
    container.innerHTML = `
      <div class="quiniela-login-prompt">
        <h3>¿Crees que puedes hacerlo mejor?</h3>
        <p>Crea tu cuenta gratis y predice los partidos del Mundial 2026. Sube al ranking.</p>
        <button class="btn btn-orange" onclick="openModal('register-modal')" style="padding:10px 24px;font-size:14px;">
          Crear cuenta gratis
        </button>
      </div>`;
    return;
  }

  const upcoming = MATCHES.filter(m => m.status === 'upcoming');
  container.innerHTML = upcoming.map(m => {
    const pick = Auth.getPick(m.id);
    return `
    <div class="quiniela-match">
      <div class="qm-header">${m.competition} · ${m.date || ''} ${m.time}</div>
      <div class="qm-teams">
        <div class="qm-team"><div class="qm-team-name">${m.home.flag} ${m.home.name}</div></div>
        <div class="qm-vs">VS</div>
        <div class="qm-team"><div class="qm-team-name">${m.away.flag} ${m.away.name}</div></div>
      </div>
      <div class="qm-picks">
        <button class="pick-btn ${pick==='home'?'selected-home':''}" onclick="savePick('${m.id}','home',this)">
          Local
        </button>
        <button class="pick-btn ${pick==='draw'?'selected-draw':''}" onclick="savePick('${m.id}','draw',this)">
          Empate
        </button>
        <button class="pick-btn ${pick==='away'?'selected-away':''}" onclick="savePick('${m.id}','away',this)">
          Visita
        </button>
      </div>
    </div>`;
  }).join('');
}

async function savePick(matchId, pick, btn) {
  if (!Auth.isLoggedIn()) { openModal('login-modal'); return; }
  const card = btn.closest('.quiniela-match');
  const btns = card.querySelectorAll('.pick-btn');
  btns.forEach(b => b.classList.remove('selected-home','selected-draw','selected-away'));
  btn.classList.add(`selected-${pick}`);
  await Auth.savePick(matchId, pick);
  _showToast('Pronóstico guardado', 'var(--green)');
}

// ── Ranking ───────────────────────────────────────────────────────────────
function renderRanking() {
  const container = document.getElementById('ranking-container');
  const posClass = ['gold','silver','bronze'];
  container.innerHTML = RANKING.map((u, i) => `
    <div class="ranking-row">
      <div class="ranking-pos ${posClass[i] || ''}">${i + 1}</div>
      <div class="ranking-name">${u.name}</div>
      <div class="ranking-pts">${u.pts} <span style="font-size:11px;color:var(--text-dim)">pts</span></div>
    </div>
  `).join('');
}

// ── Ad Settings ───────────────────────────────────────────────────────────
function loadAdSettings() {
  const settings = JSON.parse(localStorage.getItem('tvc_ad_settings') || '{}');
  const adBar = document.getElementById('ad-bar');
  const adContent = document.getElementById('ad-content');

  if (settings.adsEnabled === false) {
    adBar.classList.add('hidden');
    return;
  }
  if (settings.adCode) {
    adContent.innerHTML = settings.adCode;
  }
}

function closeAd() {
  document.getElementById('ad-bar').classList.add('hidden');
}

// ── Modal Helpers ─────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.getElementById(id === 'login-modal' ? 'login-error' : 'reg-error').textContent = '';
}
function closeAll() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
}
function switchModal(from, to) { closeModal(from); openModal(to); }

document.querySelectorAll('.modal-backdrop').forEach(b => {
  b.addEventListener('click', e => { if (e.target === b) b.classList.remove('open'); });
});

// ── Auth Forms ────────────────────────────────────────────────────────────
async function doLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');
  btn.textContent = 'Entrando...'; btn.disabled = true;
  const res = await Auth.login(
    document.getElementById('login-email').value,
    document.getElementById('login-pass').value,
  );
  btn.textContent = 'Entrar'; btn.disabled = false;
  if (res.ok) { closeAll(); _showToast('Bienvenido', 'var(--green)'); }
  else err.textContent = res.msg;
}

async function doRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('reg-btn');
  const err = document.getElementById('reg-error');
  btn.textContent = 'Creando cuenta...'; btn.disabled = true;
  const res = await Auth.register(
    document.getElementById('reg-name').value,
    document.getElementById('reg-email').value,
    document.getElementById('reg-pass').value,
  );
  btn.textContent = 'Crear cuenta gratis'; btn.disabled = false;
  if (res.ok) { closeAll(); _showToast('Cuenta creada. Revisa tu correo.', 'var(--blue)'); }
  else err.textContent = res.msg;
}

async function logout() {
  await Auth.logout();
  _showToast('Sesión cerrada', 'var(--text-dim)');
}

// ── Navigation Helpers ────────────────────────────────────────────────────
function scrollToTop(el) {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
}

function scrollToSection(id, el) {
  const el2 = document.getElementById(id);
  if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (el) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────
function _showToast(msg, color = 'var(--surface-3)') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderColor = color;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
