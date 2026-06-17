// ── TVContigo — App Logic ─────────────────────────────────────────────────

let _activeChannel = null;
let MATCH_LIVE_DATA = null;
let _matchTab = 'crono';
let _matchDataPoll = null;

document.addEventListener('DOMContentLoaded', async () => {
  captureReferral();
  loadSiteSettings();
  await authInit();
  if (Auth.isLoggedIn()) applyReferralIfAny();
  trackEvent('page', 'home');
  await loadLiveConfig();   // partido en vivo desde Supabase (editable en admin)
  renderHero();
  renderChannelStrip();
  renderMatchesRow();
  renderChannelsGrid();
  renderResultsRow();
  renderTriviaRow();
  renderQuinielaSection();
  renderRanking();
  loadFanWall();
  loadAdSettings();
  startLiveRefresh();   // la página se mantiene al día sola (cambio de partido/canales)
});

// ── Referidos ───────────────────────────────────────────────────────────────
function captureReferral() {
  const ref = new URLSearchParams(location.search).get('ref');
  if (ref) localStorage.setItem('tvc_ref', ref.toUpperCase());
}
async function applyReferralIfAny() {
  const ref = localStorage.getItem('tvc_ref');
  if (!ref) return;
  try {
    const { data } = await sb.rpc('apply_referral', { p_code: ref });
    if (data && data.ok) { localStorage.removeItem('tvc_ref'); }
  } catch (e) {}
}

// ── Integraciones del sitio (analytics + comunidad) ─────────────────────────
async function loadSiteSettings() {
  try {
    const { data } = await sb.from('site_settings').select('*').eq('id', 1).single();
    if (!data) return;
    if (data.ga_id) {
      const s = document.createElement('script'); s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + data.ga_id; document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){ dataLayer.push(arguments); };
      gtag('js', new Date()); gtag('config', data.ga_id);
    }
    if (data.pixel_id) {
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', data.pixel_id); fbq('track', 'PageView');
    }
    renderCommunity(data.whatsapp_url, data.telegram_url);
  } catch (e) {}
}
function renderCommunity(wa, tg) {
  const el = document.getElementById('community-box');
  if (!el || (!wa && !tg)) return;
  el.innerHTML = `
    <div style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">Únete a la comunidad y entérate de cada partido:</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      ${wa ? `<a href="${wa}" target="_blank" rel="noopener" style="flex:1;min-width:140px;text-align:center;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:11px;border-radius:10px;">💬 WhatsApp</a>` : ''}
      ${tg ? `<a href="${tg}" target="_blank" rel="noopener" style="flex:1;min-width:140px;text-align:center;background:#229ED9;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:11px;border-radius:10px;">✈️ Telegram</a>` : ''}
    </div>`;
}

// ── Muro de la afición ──────────────────────────────────────────────────────
async function loadFanWall() {
  const list = document.getElementById('fan-list');
  if (!list) return;
  const { data } = await sb.from('fan_messages')
    .select('name, avatar, message, created_at')
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(40);
  if (!data || !data.length) { list.innerHTML = '<p style="color:var(--text-dim);font-size:13px;">Sé el primero en dejar tu porra.</p>'; return; }
  list.innerHTML = data.map(m => {
    const ini = (m.name || '?').slice(0, 2).toUpperCase();
    const av = m.avatar
      ? `<div style="width:34px;height:34px;border-radius:50%;background-image:url('${m.avatar}');background-size:cover;background-position:center;flex-shrink:0;"></div>`
      : `<div style="width:34px;height:34px;border-radius:50%;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${ini}</div>`;
    return `<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
      ${av}
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:700;color:var(--text-dim);">${esc(m.name)}</div>
        <div style="font-size:14px;word-wrap:break-word;">${esc(m.message)}</div>
      </div>
    </div>`;
  }).join('');
}

function esc(s) { return (s || '').replace(/[<>&"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' }[c])); }

async function postFanMessage() {
  const err = document.getElementById('fan-err');
  err.textContent = '';
  if (!Auth.isLoggedIn()) { openModal('login-modal'); return; }
  const input = document.getElementById('fan-input');
  const msg = input.value.trim();
  if (!msg) { err.textContent = 'Escribe algo.'; return; }
  const { data, error } = await sb.rpc('post_fan_message', { p_message: msg });
  if (error) { err.textContent = 'Error: ' + error.message; return; }
  if (data && !data.ok) { err.textContent = data.msg; return; }
  input.value = '';
  _showToast('¡Mensaje publicado! ⚽', 'var(--green)');
  loadFanWall();
}

// Resuelve la bandera de un equipo por su nombre (desde MATCHES)
function flagFor(name) {
  for (const m of MATCHES) {
    if (m.home.name === name) return m.home.flag;
    if (m.away.name === name) return m.away.flag;
  }
  return '🏳️';
}

// ── Carga el partido en vivo desde Supabase (live_config) ─────────────────
let _curSlug = null;   // slug del partido actualmente cargado (para detectar cambios)
async function loadLiveConfig() {
  try {
    const { data } = await sb.from('live_config').select('*').eq('id', 1).single();
    if (data && data.status === 'live' && data.slug && Array.isArray(data.channels) && data.channels.length) {
      CHANNELS = buildChannels(data.slug, data.channels);  // ya viene Telemundo primero
      LIVE_MATCH = {
        id: 'live', slug: data.slug,
        home: { name: data.home_name, flag: data.home_flag || flagFor(data.home_name) },
        away: { name: data.away_name, flag: data.away_flag || flagFor(data.away_name) },
        kickoff: new Date().toISOString(), status: 'live',
        hs: data.hs ?? 0, as: data.as_ ?? 0,
        venue: data.venue || '', city: data.city || '', comp: data.comp || 'En vivo',
        defaultChannel: CHANNELS[0]?.id,   // Telemundo
      };
      _curSlug = data.slug;
      return;
    }
  } catch (e) { /* sin partido en vivo */ }
  // No hay partido en vivo: no mostramos canales viejos
  LIVE_MATCH = null;
  CHANNELS = [];
  _curSlug = null;
}

// ── Auto-refresco autónomo: la página se actualiza sola cuando cambia el ──
// ── partido o sus canales, sin recargar ni que nadie toque nada ───────────
let _liveRefresh = null;
function startLiveRefresh() {
  if (_liveRefresh) return;
  _liveRefresh = setInterval(refreshLiveConfig, 60000);  // cada 60s
}
async function refreshLiveConfig() {
  const before = _curSlug;
  await loadLiveConfig();
  if (_curSlug !== before) {
    // Cambió el partido (o terminó / empezó otro) → re-render sin recargar la página
    _activeChannel = null;
    if (_matchDataPoll) { clearInterval(_matchDataPoll); _matchDataPoll = null; }
    MATCH_LIVE_DATA = null;
    renderHero();
    renderChannelStrip();
    renderChannelsGrid();
    renderMatchesRow();
  }
}

// ── Hero ──────────────────────────────────────────────────────────────────
function renderHero() {
  const hero = document.getElementById('hero-section');
  const now = Date.now();
  const live = (LIVE_MATCH && LIVE_MATCH.status === 'live') ? LIVE_MATCH : null;
  const next = MATCHES.filter(m => m.status === 'scheduled' && new Date(m.kickoff).getTime() > now)[0];
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

  const isLive = match.status === 'live';
  if (isLive && CHANNELS.length) {
    _activeChannel = CHANNELS.find(c => c.id === match.defaultChannel) || CHANNELS[0];
  }

  const ft = fmtMatchTime(match.kickoff);
  const venueLine = match.venue ? `${match.venue} · ${match.city}` : match.comp;

  if (isLive) {
    hero.innerHTML = `
      <iframe id="live-frame" src="${_activeChannel.url}" allowfullscreen allow="autoplay; fullscreen; encrypted-media"
        onload="onStreamLoaded()" onerror="onStreamError()"
        style="width:100%;height:100%;border:none;display:block;background:#000;"></iframe>
      <div id="stream-status" class="stream-status">
        <div class="ss-spinner"></div>
        <div class="ss-text">Conectando con la transmisión…</div>
      </div>
      <div class="hero-overlay"></div>
      <div class="hero-info">
        <div class="hero-meta">
          <div class="hero-live-badge"><span style="width:6px;height:6px;border-radius:50%;background:#fff;display:inline-block;"></span> EN VIVO · <span id="hero-ch-name">${_activeChannel.name}</span></div>
          <div class="hero-title">${match.home.flag} ${match.home.name} <span id="hero-score">${match.hs}-${match.as}</span> ${match.away.name} ${match.away.flag}</div>
          <div class="hero-subtitle">📍 ${venueLine} · ${match.comp}</div>
        </div>
      </div>`;
    armStreamWatchdog();   // si no carga, avisa "No está disponible la plataforma de streaming"
    armHeroAutoHide();     // estilo Netflix: el rótulo se desvanece a los 5s
  } else {
    hero.innerHTML = `
      <div class="hero-no-live">
        <div style="font-size:13px;color:var(--orange);font-weight:700;letter-spacing:1px;">PRÓXIMO PARTIDO</div>
        <div style="font-size:34px;font-family:'Bebas Neue',sans-serif;letter-spacing:1px;">${match.home.flag} ${match.home.name} <span style="color:var(--text-muted)">vs</span> ${match.away.name} ${match.away.flag}</div>
        <p>${ft.day} ${ft.time} · ${match.comp}</p>
        <p style="font-size:11px;">📍 ${venueLine}</p>
      </div>`;
  }

  // Aviso de iframe (estilo lacancha.tv)
  renderIframeNotice(isLive);

  if (isLive) {
    startLiveScorePolling();
    startMatchDataPolling();
    showMatchTabs(true);
  } else {
    showMatchTabs(false);
  }
}

// Actualiza el marcador en vivo cada 25s sin recargar la transmisión
let _scorePoll = null;
function startLiveScorePolling() {
  if (_scorePoll) return;
  _scorePoll = setInterval(async () => {
    const scoreEl = document.getElementById('hero-score');
    if (!scoreEl) { clearInterval(_scorePoll); _scorePoll = null; return; }
    try {
      const { data } = await sb.from('live_config').select('status, hs, as_').eq('id', 1).single();
      if (!data || data.status !== 'live') { return; }
      const nv = `${data.hs ?? 0}-${data.as_ ?? 0}`;
      if (scoreEl.textContent !== nv) {
        scoreEl.textContent = nv;
        scoreEl.style.transition = 'transform .25s';
        scoreEl.style.transform = 'scale(1.25)';
        setTimeout(() => { scoreEl.style.transform = 'scale(1)'; }, 250);
        if (LIVE_MATCH) { LIVE_MATCH.hs = data.hs; LIVE_MATCH.as = data.as_; }
      }
    } catch (e) {}
  }, 25000);
}

// ── Estado de la transmisión (carga / no disponible) ──────────────────────
let _streamWatchdog = null;
function _clearWatchdog() { if (_streamWatchdog) { clearTimeout(_streamWatchdog); _streamWatchdog = null; } }

// Muestra el spinner y arranca un temporizador: si el iframe no carga, avisa.
function armStreamWatchdog() {
  _clearWatchdog();
  const ss = document.getElementById('stream-status');
  if (ss) {
    ss.className = 'stream-status';
    ss.innerHTML = `<div class="ss-spinner"></div><div class="ss-text">Conectando con la transmisión…</div>`;
  }
  // 14s sin que el iframe dispare "load" = la plataforma no respondió
  _streamWatchdog = setTimeout(() => showStreamUnavailable(), 14000);
}

// El iframe cargó: ocultamos el aviso (no podemos saber cross-origin si el video
// se ve, pero al menos confirmamos que la plataforma respondió).
function onStreamLoaded() {
  _clearWatchdog();
  const ss = document.getElementById('stream-status');
  if (ss) ss.classList.add('hidden');
}

function onStreamError() { showStreamUnavailable(); }

// Aviso claro + recuperación: "No está disponible la plataforma de streaming"
function showStreamUnavailable() {
  _clearWatchdog();
  const ss = document.getElementById('stream-status');
  if (!ss) return;
  ss.className = 'stream-status err';
  ss.innerHTML = `
    <div class="ss-icon">📡</div>
    <div class="ss-title">No está disponible la plataforma de streaming</div>
    <div class="ss-sub">Esta opción no respondió. Prueba con otra de las opciones de abajo.</div>
    <button class="ss-btn" onclick="retryStream()">↻ Reintentar</button>`;
}

function retryStream() {
  const iframe = document.getElementById('live-frame');
  if (iframe && _activeChannel) {
    armStreamWatchdog();
    const u = _activeChannel.url;
    iframe.src = 'about:blank';
    setTimeout(() => { iframe.src = u; }, 60);
  } else {
    renderHero();
  }
}

// ── Auto-ocultado del rótulo (estilo Netflix) ────────────────────────────
let _heroHideTimer = null, _heroListenersSet = false;
function armHeroAutoHide() {
  const hero = document.getElementById('hero-section');
  if (!hero) return;
  hero.classList.remove('controls-hidden');           // mostrar
  if (_heroHideTimer) clearTimeout(_heroHideTimer);
  _heroHideTimer = setTimeout(() => {
    if (LIVE_MATCH && LIVE_MATCH.status === 'live') hero.classList.add('controls-hidden');
  }, 5000);
  if (!_heroListenersSet) {
    const show = () => armHeroAutoHide();
    // Escuchamos en TODO el documento: mover el mouse sobre el iframe no llega a
    // la página (es otro dominio), así que cualquier actividad reaparece el rótulo.
    ['mousemove', 'touchstart', 'keydown'].forEach(ev => document.addEventListener(ev, show, { passive: true }));
    // Clic dentro del reproductor (ej. saltar el anuncio) → el iframe toma el foco;
    // lo detectamos para volver a mostrar el rótulo un momento.
    window.addEventListener('blur', () => {
      if (document.activeElement && document.activeElement.id === 'live-frame') show();
    });
    _heroListenersSet = true;
  }
}

function renderIframeNotice(isLive) {
  const el = document.getElementById('iframe-notice');
  if (!el) return;
  el.style.display = isLive ? 'flex' : 'none';
}

// ── Channel Strip (selector rápido tipo lacancha) ─────────────────────────
function renderChannelStrip() {
  const strip = document.getElementById('channel-strip');
  if (!CHANNELS.length) { strip.style.display = 'none'; return; }
  strip.style.display = 'flex';
  strip.innerHTML = CHANNELS.map((ch, i) => `
    <div class="channel-chip ${i === 0 ? 'active' : ''}" onclick="switchChannel('${ch.id}', this)">
      <span class="chip-name">${ch.name}</span>
      <span class="chip-label">${ch.option}</span>
      ${ch.tag ? `<span class="chip-tag">${ch.tag}</span>` : (ch.live ? '<span class="chip-live">● EN VIVO</span>' : '')}
    </div>
  `).join('');
}

function switchChannel(channelId, el) {
  const ch = CHANNELS.find(c => c.id === channelId);
  // Canal inexistente o sin transmisión → avisamos y no rompemos nada
  if (!ch || !ch.url) {
    _showToast('📡 No está disponible la plataforma de streaming', 'var(--red)');
    showStreamUnavailable();
    return;
  }
  _activeChannel = ch;

  document.querySelectorAll('.channel-chip').forEach(c => c.classList.remove('active'));
  if (el && el.classList.contains('channel-chip')) {
    el.classList.add('active');
  } else {
    const chip = document.querySelector(`.channel-chip[onclick*="${ch.id}"]`);
    if (chip) chip.classList.add('active');
  }

  const hero = document.getElementById('hero-section');
  const iframe = hero.querySelector('iframe');
  if (iframe) {
    armStreamWatchdog();                       // muestra "Conectando…" y vigila
    const nm = document.getElementById('hero-ch-name');
    if (nm) nm.textContent = ch.name;
    iframe.src = ch.url;
  } else {
    renderHero();                              // arma el watchdog dentro
    setTimeout(() => {
      const f = document.getElementById('live-frame');
      if (f) f.src = ch.url;
    }, 50);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  _showToast(`📺 ${ch.name} ${ch.option}`, 'var(--blue)');
  trackEvent('channel', ch.name);
  trackEvent('live', 'watch');
}

// ── Matches Row (en vivo + próximos) ──────────────────────────────────────
function renderMatchesRow() {
  const row = document.getElementById('matches-row');
  const now = Date.now();
  const live = (LIVE_MATCH && LIVE_MATCH.status === 'live') ? [LIVE_MATCH] : [];
  const upcoming = MATCHES.filter(m => m.status === 'scheduled' && new Date(m.kickoff).getTime() > now).slice(0, 14);
  const list = [...live, ...upcoming];

  row.innerHTML = list.map(m => {
    const isLive = m.status === 'live';
    const ft = fmtMatchTime(m.kickoff);
    const click = isLive
      ? `switchChannel('${m.defaultChannel || (CHANNELS[0] && CHANNELS[0].id) || ''}')`
      : `openMatchInfo('${m.id}')`;   // partido próximo → cuenta regresiva + avísame
    return `
    <div class="match-card ${isLive ? 'live' : ''}" onclick="${click}">
      <div class="mc-status ${isLive ? 'live' : 'upcoming'}">
        ${isLive ? '● EN VIVO' : '⏰ ' + ft.day + ' ' + ft.time}
      </div>
      <div class="mc-teams">
        <div class="mc-team">
          <div class="mc-flag">${m.home.flag}</div>
          <div class="mc-team-name">${m.home.name}</div>
        </div>
        <div class="mc-score-block">
          <div class="mc-score">${isLive ? `${m.hs}-${m.as}` : 'vs'}</div>
        </div>
        <div class="mc-team">
          <div class="mc-flag">${m.away.flag}</div>
          <div class="mc-team-name">${m.away.name}</div>
        </div>
      </div>
      <div class="mc-competition">${m.comp}</div>
    </div>`;
  }).join('');
}

// ── Partido próximo: cuenta regresiva + "Avísame" ─────────────────────────
let _miMatch = null, _miTimer = null;
function openMatchInfo(matchId) {
  const m = MATCHES.find(x => x.id === matchId);
  if (!m) return;
  _miMatch = m;
  const ft = fmtMatchTime(m.kickoff);
  document.getElementById('mi-comp').textContent = m.comp || 'Mundial 2026';
  document.getElementById('mi-teams').innerHTML =
    `${m.home.flag} ${m.home.name} <span style="color:var(--text-muted)">vs</span> ${m.away.name} ${m.away.flag}`;
  document.getElementById('mi-when').textContent = `${ft.day} · ${ft.time}`;
  _renderCountdown();
  if (_miTimer) clearInterval(_miTimer);
  _miTimer = setInterval(_renderCountdown, 1000);
  _refreshNotifyBtn();
  openModal('match-info-modal');
  trackEvent('match_info', m.id);
}

function _renderCountdown() {
  const modal = document.getElementById('match-info-modal');
  if (modal && !modal.classList.contains('open')) {
    if (_miTimer) { clearInterval(_miTimer); _miTimer = null; }
    return;
  }
  const el = document.getElementById('mi-countdown');
  if (!el || !_miMatch) return;
  const diff = new Date(_miMatch.kickoff).getTime() - Date.now();
  if (diff <= 0) {
    el.innerHTML = `<div class="mi-live">● A punto de empezar… abriremos la señal en cuanto esté al aire</div>`;
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const mn = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const box = (v, l) => `<div class="cd-box"><div class="cd-num">${String(v).padStart(2, '0')}</div><div class="cd-lbl">${l}</div></div>`;
  el.innerHTML = (d > 0 ? box(d, 'días') : '') + box(h, 'hrs') + box(mn, 'min') + box(s, 'seg');
}

function _refreshNotifyBtn() {
  const btn = document.getElementById('mi-notify');
  if (!btn || !_miMatch) return;
  const ids = JSON.parse(localStorage.getItem('tvc_notify_matches') || '[]');
  const on = ids.includes(_miMatch.id) && typeof Notification !== 'undefined' && Notification.permission === 'granted';
  if (on) {
    btn.textContent = '✓ Te avisaremos cuando empiece';
    btn.disabled = true; btn.style.opacity = '.75'; btn.style.cursor = 'default';
  } else {
    btn.textContent = '🔔 Avísame cuando empiece';
    btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
  }
}

async function avisarMatch() {
  if (_miMatch) {
    const ids = JSON.parse(localStorage.getItem('tvc_notify_matches') || '[]');
    if (!ids.includes(_miMatch.id)) { ids.push(_miMatch.id); localStorage.setItem('tvc_notify_matches', JSON.stringify(ids)); }
    trackEvent('notify_match', _miMatch.id);
  }
  await subscribePush();   // pide permiso + guarda la suscripción (push.js)
  _refreshNotifyBtn();
}

function addToCalendar() {
  if (!_miMatch) return;
  const start = new Date(_miMatch.kickoff);
  const end = new Date(start.getTime() + 2 * 3600000);
  const fmt = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const text = encodeURIComponent(`${_miMatch.home.name} vs ${_miMatch.away.name} — Mundial 2026`);
  const details = encodeURIComponent('Míralo gratis en TVContigo: https://tvcontigo.site');
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(start)}/${fmt(end)}&details=${details}`;
  window.open(url, '_blank', 'noopener');
  trackEvent('add_calendar', _miMatch.id);
}

// ── Channels Grid ─────────────────────────────────────────────────────────
function renderChannelsGrid() {
  const grid = document.getElementById('channels-grid');
  if (!CHANNELS.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px 16px;color:var(--text-dim);font-size:13px;">
      📺 Los canales se activan cuando hay un partido en vivo.<br>Revisa los próximos partidos abajo. ⚽</div>`;
    return;
  }
  grid.innerHTML = CHANNELS.map(ch => `
    <div class="ch-card" onclick="switchChannel('${ch.id}')">
      <div class="ch-name">${ch.name}</div>
      <div class="ch-option">${ch.option}</div>
      ${ch.live ? `<div class="ch-live-tag">
        <span style="width:6px;height:6px;background:var(--red);border-radius:50%;display:inline-block;"></span>
        EN VIVO
      </div>` : ''}
    </div>
  `).join('');
}

// ── Results Row (partidos finalizados) ────────────────────────────────────
function renderResultsRow() {
  const row = document.getElementById('results-row');
  const results = MATCHES.filter(m => m.status === 'finished').reverse();
  row.innerHTML = results.map(r => `
    <div class="result-card">
      <div class="rc-competition">${r.comp}</div>
      <div class="rc-row">
        <div class="rc-team">${r.home.flag} ${r.home.name}</div>
        <div class="rc-score">${r.hs}-${r.as}</div>
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

  const upcoming = MATCHES.filter(m => m.status === 'scheduled');
  container.innerHTML = upcoming.map(m => {
    const pick = Auth.getPick(m.id);
    const ft = fmtMatchTime(m.kickoff);
    return `
    <div class="quiniela-match">
      <div class="qm-header">${m.comp} · ${ft.day} ${ft.time}</div>
      <div class="qm-teams">
        <div class="qm-team"><div class="qm-team-name">${m.home.flag} ${m.home.name}</div></div>
        <div class="qm-vs">VS</div>
        <div class="qm-team"><div class="qm-team-name">${m.away.flag} ${m.away.name}</div></div>
      </div>
      <div class="qm-picks">
        <button class="pick-btn ${pick==='home'?'selected-home':''}" onclick="savePick('${m.id}','home',this)">Local</button>
        <button class="pick-btn ${pick==='draw'?'selected-draw':''}" onclick="savePick('${m.id}','draw',this)">Empate</button>
        <button class="pick-btn ${pick==='away'?'selected-away':''}" onclick="savePick('${m.id}','away',this)">Visita</button>
      </div>
    </div>`;
  }).join('');
}

async function savePick(matchId, pick, btn) {
  if (!Auth.isLoggedIn()) { openModal('login-modal'); return; }
  const card = btn.closest('.quiniela-match');
  card.querySelectorAll('.pick-btn').forEach(b => b.classList.remove('selected-home','selected-draw','selected-away'));
  btn.classList.add(`selected-${pick}`);
  await Auth.savePick(matchId, pick);
  _showToast('Pronóstico guardado', 'var(--green)');
}

// ── Ranking (real desde Supabase, con respaldo) ───────────────────────────
async function renderRanking() {
  const container = document.getElementById('ranking-container');
  const posClass = ['gold','silver','bronze'];
  let list = RANKING;
  try {
    const { data } = await sb.rpc('top_ranking');
    if (data && data.length) list = data;
  } catch (e) {}
  container.innerHTML = list.map((u, i) => {
    const ini = (u.name || '?').slice(0, 2).toUpperCase();
    const av = u.avatar
      ? `<div style="width:30px;height:30px;border-radius:50%;background-image:url('${u.avatar}');background-size:cover;background-position:center;flex-shrink:0;"></div>`
      : `<div style="width:30px;height:30px;border-radius:50%;background:var(--surface-3);color:var(--text-dim);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">${ini}</div>`;
    return `<div class="ranking-row">
      <div class="ranking-pos ${posClass[i] || ''}">${i + 1}</div>
      ${av}
      <div class="ranking-name">${esc(u.name)}</div>
      <div class="ranking-pts">${u.pts} <span style="font-size:11px;color:var(--text-dim)">pts</span></div>
    </div>`;
  }).join('');
}

// ── Ad Settings (global, desde Supabase, adaptado PC/móvil) ───────────────
async function loadAdSettings() {
  const adBar = document.getElementById('ad-bar');
  const adContent = document.getElementById('ad-content');
  try {
    const { data } = await sb.from('ad_config').select('*').eq('id', 1).single();
    if (!data || !data.enabled) { adBar.classList.add('hidden'); return; }
    const isMobile = window.matchMedia('(max-width: 640px)').matches;

    // Prioridad: imagen propia → código (AdSense/HTML)
    const img = isMobile ? (data.mobile_img || data.desktop_img) : (data.desktop_img || data.mobile_img);
    if (img) {
      const link = data.link_url || '#';
      adContent.innerHTML = `<a href="${link}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;height:100%;">
        <img src="${img}" alt="anuncio" style="max-height:60px;max-width:100%;border-radius:6px;">
      </a>`;
      return;
    }

    const code = isMobile ? (data.mobile_code || data.desktop_code) : (data.desktop_code || data.mobile_code);
    if (code && code.trim()) {
      adContent.innerHTML = code;
      adContent.querySelectorAll('script').forEach(old => {
        const s = document.createElement('script');
        [...old.attributes].forEach(a => s.setAttribute(a.name, a.value));
        s.textContent = old.textContent;
        old.replaceWith(s);
      });
    }
  } catch (e) { /* deja el placeholder por defecto */ }
}

function closeAd() {
  document.getElementById('ad-bar').classList.add('hidden');
}

// ── Modal Helpers ─────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  const err = document.getElementById(id === 'login-modal' ? 'login-error' : 'reg-error');
  if (err) err.textContent = '';
  if (id === 'match-info-modal' && _miTimer) { clearInterval(_miTimer); _miTimer = null; }
}
function closeAll() { document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open')); }
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
  if (el) el.classList.add('active');
}
function scrollToSection(id, el) {
  const t = document.getElementById(id);
  if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

// ── Match Live Tabs (Cronología / Estadísticas) ───────────────────────────
function showMatchTabs(show) {
  const sec = document.getElementById('match-tabs-section');
  if (sec) sec.style.display = show ? '' : 'none';
}

function setTab(name) {
  _matchTab = name;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  const crono = document.getElementById('tab-crono');
  const stats  = document.getElementById('tab-stats');
  if (crono) crono.style.display = name === 'crono' ? '' : 'none';
  if (stats)  stats.style.display  = name === 'stats'  ? '' : 'none';
}

function _iconForEvent(type, detail) {
  const t = ((type || '') + ' ' + (detail || '')).toLowerCase();
  if (t.includes('own goal'))    return '⚽🔄';
  if (t.includes('penalty'))     return '⚽⚡';
  if (t.includes('goal'))        return '⚽';
  if (t.includes('yellow'))      return '🟨';
  if (t.includes('red'))         return '🟥';
  if (t.includes('substitut') || t.includes(' sub')) return '🔄';
  if (t.includes('var'))         return '📺';
  if (t.includes('offside'))     return '🚩';
  return '📋';
}

function renderCrono(data) {
  const el = document.getElementById('tab-crono');
  if (!el) return;
  const events = Array.isArray(data?.events) ? data.events : [];
  if (!events.length) {
    el.innerHTML = '<div class="tab-empty">Sin eventos registrados aún.</div>';
    return;
  }
  const sorted = [...events].sort((a, b) => {
    const ma = +(a.time?.elapsed ?? a.minute ?? 0);
    const mb = +(b.time?.elapsed ?? b.minute ?? 0);
    return mb - ma;
  });
  el.innerHTML = sorted.map(ev => {
    const elapsed = ev.time?.elapsed ?? ev.minute ?? '?';
    const extra   = ev.time?.extra ? `+${ev.time.extra}` : '';
    const type    = ev.type   || ev.event_type || '';
    const detail  = ev.detail || '';
    const player  = ev.player?.name || ev.player_name || ev.player || '';
    const icon    = _iconForEvent(type, detail);
    return `<div class="crono-row">
      <div class="crono-min">${elapsed}${extra}'</div>
      <div class="crono-icon">${icon}</div>
      <div class="crono-player">${esc(player)}<span class="crono-detail">${esc(detail || type)}</span></div>
    </div>`;
  }).join('');
}

function renderStatsTab(data) {
  const el = document.getElementById('tab-stats');
  if (!el) return;
  const stats = Array.isArray(data?.stats) ? data.stats : [];
  const minute = data?.minute;
  const homeName = LIVE_MATCH?.home?.name || 'Local';
  const awayName = LIVE_MATCH?.away?.name || 'Visita';
  if (!stats.length) {
    el.innerHTML = '<div class="tab-empty">Estadísticas no disponibles.</div>';
    return;
  }
  const statMap = {
    'Ball Possession':'Posesión','Shots on Goal':'Tiros al arco',
    'Shots off Goal':'Tiros fuera','Total Shots':'Tiros totales',
    'Blocked Shots':'Tiros bloqueados','Corner Kicks':'Corners',
    'Fouls':'Faltas','Yellow Cards':'Amarillas','Red Cards':'Rojas',
    'Offsides':'Fuera de lugar','Passes':'Pases','Passes %':'Precisión pases',
    'Goalkeeper Saves':'Atajadas','Expected Goals':'Goles esperados',
  };
  const header = `<div class="stats-header">
    <span>${esc(homeName)}</span>
    ${minute ? `<span class="stats-min">${minute}'</span>` : '<span></span>'}
    <span>${esc(awayName)}</span>
  </div>`;
  const rows = stats.map(s => {
    const label = statMap[s.type] || s.type || '';
    const hv = s.home ?? '';
    const av = s.away ?? '';
    const hNum = parseFloat(String(hv).replace(/[^0-9.]/g,'')) || 0;
    const aNum = parseFloat(String(av).replace(/[^0-9.]/g,'')) || 0;
    const total = hNum + aNum || 1;
    const hPct = Math.round(hNum / total * 100);
    return `<div class="stat-row">
      <div class="stat-val home">${esc(String(hv))}</div>
      <div class="stat-label">${esc(label)}</div>
      <div class="stat-val away">${esc(String(av))}</div>
      <div class="stat-bar-wrap">
        <div class="stat-bar-home" style="width:${hPct}%"></div>
        <div class="stat-bar-away" style="width:${100 - hPct}%"></div>
      </div>
    </div>`;
  }).join('');
  el.innerHTML = header + rows;
}

async function loadMatchLiveData() {
  if (!LIVE_MATCH) return;
  try {
    const { data } = await sb.from('match_live_data').select('*').eq('id', 'current').single();
    if (data) {
      MATCH_LIVE_DATA = data;
      if (_matchTab === 'crono') renderCrono(data);
      else renderStatsTab(data);
      // Always keep both tabs up to date
      renderCrono(data);
      renderStatsTab(data);
    }
  } catch (e) {}
}

function startMatchDataPolling() {
  if (_matchDataPoll) return;
  loadMatchLiveData();
  _matchDataPoll = setInterval(loadMatchLiveData, 30000);
}
