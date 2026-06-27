// ── TVContigo — App Logic ─────────────────────────────────────────────────

// ── Auto-reset de versión ("hard reset" para todos los dispositivos) ──────
// Esta build. Debe coincidir con version.json y el CACHE del Service Worker.
const APP_BUILD = 'v66';
const APP_VERSION = APP_BUILD;   // alias visible (footer + consola) para diagnóstico
console.log('[TVContigo] App started · build', APP_BUILD);
// Si el version.json del servidor anuncia una build distinta, significa que el
// código en ejecución está cacheado/viejo → borra TODAS las cachés, actualiza
// el SW y recarga UNA sola vez (sessionStorage evita bucles de recarga).
async function checkAppVersion() {
  try {
    const res = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return;
    const { build } = await res.json();
    if (!build || build === APP_BUILD) return;
    console.log('[TVContigo] Nueva versión en el servidor:', build, '≠', APP_BUILD, '→ limpiando caché y recargando');
    const flag = 'tvc_reset_' + build;
    if (sessionStorage.getItem(flag)) return;   // ya intentamos resetear a esta build
    sessionStorage.setItem(flag, '1');
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) { try { await reg.update(); } catch (e) {} }
    }
    window.location.reload();
  } catch (e) { /* sin red: se queda con lo que tiene */ }
}
checkAppVersion();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkAppVersion();
});
window.addEventListener('online', checkAppVersion);

// Recarga automática cuando hay SW nuevo — dos mecanismos complementarios:
// 1) controllerchange: SW nuevo toma control (todos los browsers)
// 2) message SW_UPDATED: SW nuevo notifica tras limpiar caché (más agresivo en iOS)
if ('serviceWorker' in navigator) {
  // Cuando el usuario vuelve a la PWA (iOS la cierra en background), forzar check de SW
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then(reg => { if (reg) reg.update(); });
    }
  });
  // Check periódico cada 5 min: cubre tabs abiertas mucho tiempo sin ir al background
  setInterval(() => {
    navigator.serviceWorker.getRegistration().then(reg => { if (reg) reg.update(); });
  }, 5 * 60 * 1000);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[TVContigo] Service worker updated (controllerchange) → recargando');
    // Esperar a que la página esté lista antes de recargar (evita reload interrumpido en Android)
    if (document.readyState === 'complete') window.location.reload();
    else window.addEventListener('load', () => window.location.reload(), { once: true });
  });
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type !== 'SW_UPDATED') return;
    console.log('[TVContigo] Service worker updated (mensaje SW_UPDATED) → recargando');
    if (document.readyState === 'complete') window.location.reload();
    else window.addEventListener('load', () => window.location.reload(), { once: true });
  });
}

let _activeChannel = null;
let MATCH_LIVE_DATA = null;
let RECENT_RESULT   = null;
let _matchTab = 'crono';
let _matchDataPoll = null;

// ── Normalización de nombres EN→ES (auto-live a veces guarda en inglés) ───
const _EN_ES = {
  'united states':'EE.UU.','usa':'EE.UU.',
  'south korea':'Corea del Sur','ivory coast':'Costa de Marfil',
  'new zealand':'Nueva Zelanda','south africa':'Sudáfrica',
  'cape verde':'Cabo Verde','cape verde islands':'Cabo Verde','rd congo':'RD Congo','dr congo':'RD Congo',
  'saudi arabia':'Arabia Saudita','netherlands':'Países Bajos',
  'germany':'Alemania','spain':'España','france':'Francia',
  'brazil':'Brasil','england':'Inglaterra','turkey':'Turquía',
  'czechia':'Chequia','algeria':'Argelia','morocco':'Marruecos',
  'croatia':'Croacia','sweden':'Suecia','norway':'Noruega',
  'tunisia':'Túnez','egypt':'Egipto','scotland':'Escocia',
  'belgium':'Bélgica','austria':'Austria','jordan':'Jordania',
  'ghana':'Ghana','panama':'Panamá','uzbekistan':'Uzbekistán',
  'switzerland':'Suiza','japan':'Japón','mexico':'México',
  'canada':'Canadá','australia':'Australia','iraq':'Irak',
  'senegal':'Senegal','uruguay':'Uruguay','iran':'Irán',
  'ecuador':'Ecuador','colombia':'Colombia','argentina':'Argentina',
  'portugal':'Portugal','curacao':'Curazao','cura ao':'Curazao','haiti':'Haití',
  'paraguay':'Paraguay','qatar':'Catar','bosnia':'Bosnia',
};
const _normName = n => _EN_ES[(n || '').toLowerCase()] || n;

// Banderas por nombre de equipo (respaldo cuando MATCHES no tiene al equipo)
const _FLAGS = {
  'EE.UU.':'🇺🇸','United States':'🇺🇸','USA':'🇺🇸',
  'México':'🇲🇽','Mexico':'🇲🇽',
  'Canadá':'🇨🇦','Canada':'🇨🇦',
  'Brasil':'🇧🇷','Brazil':'🇧🇷',
  'Argentina':'🇦🇷','Colombia':'🇨🇴','Ecuador':'🇪🇨',
  'Paraguay':'🇵🇾','Uruguay':'🇺🇾','Chile':'🇨🇱',
  'Perú':'🇵🇪','Peru':'🇵🇪','Bolivia':'🇧🇴',
  'Venezuela':'🇻🇪','Panamá':'🇵🇦','Panama':'🇵🇦',
  'Costa Rica':'🇨🇷','Honduras':'🇭🇳','Jamaica':'🇯🇲',
  'Haití':'🇭🇹','Haiti':'🇭🇹','Cuba':'🇨🇺',
  'El Salvador':'🇸🇻','Guatemala':'🇬🇹',
  'España':'🇪🇸','Spain':'🇪🇸',
  'Francia':'🇫🇷','France':'🇫🇷',
  'Alemania':'🇩🇪','Germany':'🇩🇪',
  'Italia':'🇮🇹','Italy':'🇮🇹',
  'Portugal':'🇵🇹','Países Bajos':'🇳🇱','Netherlands':'🇳🇱',
  'Bélgica':'🇧🇪','Belgium':'🇧🇪',
  'Suiza':'🇨🇭','Switzerland':'🇨🇭',
  'Austria':'🇦🇹','Croacia':'🇭🇷','Croatia':'🇭🇷',
  'Suecia':'🇸🇪','Sweden':'🇸🇪',
  'Noruega':'🇳🇴','Norway':'🇳🇴',
  'Dinamarca':'🇩🇰','Denmark':'🇩🇰',
  'Chequia':'🇨🇿','Czechia':'🇨🇿',
  'Eslovaquia':'🇸🇰','Polonia':'🇵🇱','Poland':'🇵🇱',
  'Hungría':'🇭🇺','Rumania':'🇷🇴','Romania':'🇷🇴',
  'Serbia':'🇷🇸','Grecia':'🇬🇷','Greece':'🇬🇷',
  'Turquía':'🇹🇷','Turkey':'🇹🇷',
  'Ucrania':'🇺🇦','Ukraine':'🇺🇦',
  'Escocia':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Inglaterra':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Gales':'🏴󠁧󠁢󠁷󠁬󠁳󠁿','Wales':'🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Irlanda':'🇮🇪','Ireland':'🇮🇪',
  'Japón':'🇯🇵','Japan':'🇯🇵',
  'Corea del Sur':'🇰🇷','South Korea':'🇰🇷',
  'Australia':'🇦🇺','Nueva Zelanda':'🇳🇿','New Zealand':'🇳🇿',
  'China':'🇨🇳','Irán':'🇮🇷','Iran':'🇮🇷',
  'Arabia Saudita':'🇸🇦','Saudi Arabia':'🇸🇦',
  'Jordania':'🇯🇴','Jordan':'🇯🇴',
  'Irak':'🇮🇶','Iraq':'🇮🇶',
  'Catar':'🇶🇦','Qatar':'🇶🇦',
  'Uzbekistán':'🇺🇿','Uzbekistan':'🇺🇿',
  'Marruecos':'🇲🇦','Morocco':'🇲🇦',
  'Senegal':'🇸🇳','Argelia':'🇩🇿','Algeria':'🇩🇿',
  'Ghana':'🇬🇭','Egipto':'🇪🇬','Egypt':'🇪🇬',
  'Túnez':'🇹🇳','Tunisia':'🇹🇳',
  'Nigeria':'🇳🇬','Sudáfrica':'🇿🇦','South Africa':'🇿🇦',
  'Costa de Marfil':'🇨🇮','Ivory Coast':'🇨🇮',
  'Camerún':'🇨🇲','Cameroon':'🇨🇲',
  'RD Congo':'🇨🇩','DR Congo':'🇨🇩',
  'Tanzania':'🇹🇿','Angola':'🇦🇴','Zambia':'🇿🇲','Kenia':'🇰🇪','Kenya':'🇰🇪',
  'Cabo Verde':'🇨🇻','Cape Verde':'🇨🇻',
  'Curazao':'🇨🇼','Curacao':'🇨🇼','Cura Ao':'🇨🇼',
  'Bosnia':'🇧🇦',
};

// ── ¿Hay partido realmente EN VIVO? ──────────────────────────────────────
// La verdad la da live_config.status, que el auto-sync (auto-live) fija según
// la fuente externa EN TIEMPO REAL. NO suprimir por el kickoff del calendario
// estático: sus fechas son simuladas (2026) y un partido en vivo cuyo horario
// programado aún "no llega" se ocultaría junto con TODOS sus canales.
function _isActuallyLive() {
  return !!(LIVE_MATCH && LIVE_MATCH.status === 'live');
}

document.addEventListener('DOMContentLoaded', async () => {
  const _verEl = document.getElementById('app-version-label');
  if (_verEl) _verEl.textContent = APP_VERSION;
  captureReferral();
  loadSiteSettings();
  await authInit();
  if (Auth.isLoggedIn()) applyReferralIfAny();
  trackEvent('page', 'home');
  await loadMatches();      // calendario dinámico desde Supabase (con respaldo estático)
  await loadStreamSources();// fuentes autorizadas configuradas por el operador
  await loadLiveConfig();   // partido en vivo desde Supabase (editable en admin)
  await loadMatchResults(); // resultados finales desde Supabase (auto-sync cada 10 min)
  renderHero();
  renderChannelStrip();
  renderLiveSwitcher();
  renderMatchesRow();
  renderChannelsGrid();
  renderResultsRow();
  renderStandings();
  renderTriviaRow();
  renderQuinielaSection();
  renderRanking();
  awardDailyLogin();          // suma login diario si hay sesión (recreativo)
  renderChannelFilters();     // filtros del catálogo "Todos los canales"
  renderChallenges();         // retos del día
  renderPointsToday();        // módulo de puntos
  renderRewards();            // niveles + recompensas
  loadFanWall();
  loadAdSettings();
  startLiveRefresh();   // la página se mantiene al día sola (cambio de partido/canales)
  _subscribeRealtimeLive(); // marcador en tiempo real vía WebSocket (< 1s, sin polling)

  // Health-check del canal Realtime cada 30s
  // cubre canales que mueren silenciosamente sin disparar CHANNEL_ERROR
  setInterval(() => {
    if (!_realtimeChannel) _subscribeRealtimeLive();
  }, 30000);
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
let _waLink = '';
function renderCommunity(wa, tg) {
  // Botón "WhatsApp · picks de hoy" bajo el reproductor: se muestra solo si hay URL
  const waBtn = document.getElementById('pa-wa-link');
  if (waBtn) {
    if (wa) { _waLink = wa; waBtn.href = wa; waBtn.style.display = ''; }
    else { waBtn.style.display = 'none'; }
  }
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
// Intenta primero con el nombre tal cual, luego con la traducción EN→ES
function flagFor(name) {
  const norm = _normName(name);
  for (const m of MATCHES) {
    if (m.home.name === name || m.home.name === norm) return m.home.flag;
    if (m.away.name === name || m.away.name === norm) return m.away.flag;
  }
  return _FLAGS[name] || _FLAGS[norm] || '🏳️';
}

// ── Resolución de fuentes de transmisión (sistema de proveedores) ─────────
// Devuelve las fuentes utilizables para un partido, por prioridad:
//   1) proveedores AUTORIZADOS explícitos (oficiales) → siempre se cargan, con atribución.
//   2) canales del operador (live_config) → solo si STREAM_CONFIG.allowExternalEmbeds !== false.
// Si no hay ninguna fuente válida, devuelve [] → la UI muestra el placeholder elegante.
function resolveMatchStreams(slug, channelDefs) {
  const sources = [];
  // 1) Fuentes autorizadas explícitas (con derechos), declaradas por el operador
  if (typeof STREAM_PROVIDERS !== 'undefined' && Array.isArray(STREAM_PROVIDERS)) {
    STREAM_PROVIDERS
      .filter(p => p.matchSlug === slug && p.isActive && p.isAuthorized && p.embedUrl)
      .forEach((p, i) => sources.push({
        id: 'auth-' + i, name: p.name || 'Fuente autorizada', option: 'AUTORIZADA',
        url: p.embedUrl, live: true, tag: 'OFICIAL',
        requiresAttribution: !!p.requiresAttribution, attribution: p.attribution || '',
      }));
  }
  // 1b) Fuentes configuradas por el operador desde el admin (Supabase stream_sources)
  if (Array.isArray(STREAM_SOURCES_LIVE)) {
    STREAM_SOURCES_LIVE
      .filter(s => s.active && s.embed_url && (s.match_slug === '' || s.match_slug === slug))
      .forEach(s => sources.push({
        id: 'src-' + s.id, name: s.channel_name || s.channel_id, option: s.quality || 'HD',
        url: s.embed_url, live: true, tag: s.badge || 'OFICIAL',
        requiresAttribution: !!s.official_url, attribution: s.official_url ? ('Transmite: ' + s.official_url) : '',
      }));
  }
  // 2) Canales del operador (embeds externos) — gateados por el interruptor global
  const allow = (typeof STREAM_CONFIG === 'undefined') || STREAM_CONFIG.allowExternalEmbeds !== false;
  if (allow && Array.isArray(channelDefs) && channelDefs.length) {
    buildChannels(slug, channelDefs).forEach(ch => sources.push(ch));
  }
  console.log('[TVContigo] Stream provider:', sources.length, 'fuente(s) ·', slug, '· embeds externos', allow ? 'ON' : 'OFF');
  return sources;
}
// Accesor público pedido por el flujo de proveedores
function getAuthorizedStreamsForMatch(slug) { return resolveMatchStreams(slug, _liveChannelDefs); }

// ── Carga el partido en vivo desde Supabase (live_config) ─────────────────
let _curSlug = null;          // slug del partido actualmente cargado (para detectar cambios)
let _liveChannelDefs = [];    // defs crudas (con n) del destacado, para reusar en simultáneos
let _simulLive = [];          // partidos SIMULTÁNEOS en vivo (misma hora que el destacado)
let _featuredMatch = null;    // el partido destacado tal cual viene de live_config
let _userPickedSlug = null;   // slug que el usuario eligió ver entre los simultáneos

async function loadLiveConfig() {
  try {
    const { data } = await sb.from('live_config').select('*').eq('id', 1).single();
    if (data && data.status === 'live' && data.slug) {
      _liveChannelDefs = Array.isArray(data.channels) ? data.channels : [];
      const featured = {
        id: 'live', slug: data.slug,
        home: { name: data.home_name, flag: data.home_flag || flagFor(data.home_name) },
        away: { name: data.away_name, flag: data.away_flag || flagFor(data.away_name) },
        kickoff: new Date().toISOString(), status: 'live',
        hs: data.hs ?? 0, as: data.as_ ?? 0,
        venue: data.venue || '', city: data.city || '', comp: data.comp || 'En vivo',
      };
      _featuredMatch = featured;
      _simulLive = _computeSimultaneous(featured);   // partidos a la misma hora → también en vivo
      // Si el usuario eligió ver un simultáneo y sigue vigente, respétalo; si no, el destacado.
      const pick = _userPickedSlug && _simulLive.find(m => m.slug === _userPickedSlug);
      if (pick) {
        LIVE_MATCH = pick;
        CHANNELS   = resolveMatchStreams(pick.slug, _liveChannelDefs);
      } else {
        _userPickedSlug = null;
        LIVE_MATCH = featured;
        CHANNELS = resolveMatchStreams(data.slug, _liveChannelDefs);
      }
      LIVE_MATCH.defaultChannel = CHANNELS[0]?.id;
      _curSlug = data.slug;
      return;
    }
    // live_config 'off' → ¿el calendario marca partidos EN VIVO ahora? (tabla matches,
    // ya confiable: el cron limpia 'live' stale a los 12 min + filtro de frescura <25 min).
    // Si los hay, se MUESTRAN igual (ver el partido + su marcador); los canales salen
    // solo de fuentes AUTORIZADAS configuradas — si no hay, placeholder "sin fuente".
    const tableLive = _liveTableMatches();
    if (tableLive.length) {
      _liveChannelDefs = [];
      let featured = null;
      // Si live_config guardó canales (de auto-live) para uno de los partidos que
      // AHORA están en vivo —aunque su status quedara 'off' por el gate de la API—,
      // ese partido es REPRODUCIBLE con esos canales (Telemundo primero por chRank).
      if (data && Array.isArray(data.channels) && data.channels.length && data.home_name) {
        const cfgMatch = tableLive.find(m =>
          _normName(m.home.name) === _normName(data.home_name) &&
          _normName(m.away.name) === _normName(data.away_name));
        if (cfgMatch) {
          _liveChannelDefs = data.channels;
          featured = _liveCardFrom(cfgMatch);
          featured.slug = data.slug || featured.slug;
        }
      }
      if (!featured) featured = _liveCardFrom(tableLive[0]);
      _featuredMatch = featured;
      _simulLive = _computeSimultaneous(featured);
      const pick = _userPickedSlug && _simulLive.find(m => m.slug === _userPickedSlug);
      LIVE_MATCH = pick || featured;
      if (!pick) _userPickedSlug = null;
      CHANNELS = resolveMatchStreams(LIVE_MATCH.slug, (LIVE_MATCH === featured) ? _liveChannelDefs : []);
      LIVE_MATCH.defaultChannel = CHANNELS[0]?.id;
      _curSlug = LIVE_MATCH.slug;
      return;
    }
    // Sin live en ninguna fuente → limpiar (la home muestra "Partidos de hoy")
    LIVE_MATCH = null; CHANNELS = []; _curSlug = null;
    _liveChannelDefs = []; _simulLive = []; _featuredMatch = null; _userPickedSlug = null;
  } catch (e) {
    // Error de red: conservar estado anterior (no borrar LIVE_MATCH)
  }
}

// Slug de respaldo desde nombres (cuando deriveSlug no cubre al equipo)
function _nameSlug(n) { return (n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function _liveSlugFor(home, away) { return deriveSlug(home, away) || ('live-' + _nameSlug(home) + '-vs-' + _nameSlug(away)); }
function _liveCardFrom(m) {
  return {
    id: 'live', slug: _liveSlugFor(m.home.name, m.away.name), status: 'live',
    home: { name: m.home.name, flag: m.home.flag || flagFor(m.home.name) },
    away: { name: m.away.name, flag: m.away.flag || flagFor(m.away.name) },
    kickoff: new Date().toISOString(), hs: m.hs ?? 0, as: m.as ?? 0,
    venue: m.venue || '', city: m.city || '', comp: m.comp || 'En vivo',
  };
}
// Un partido cuenta como EN VIVO para mostrar si la tabla lo marca 'live' Y su
// dato es reciente (<25 min). Doble seguro anti-pegado: el cron limpia stale a los
// 12 min (GRACE) y además aquí no mostramos un 'live' viejo aunque el cron fallara.
function _liveTableMatches() {
  const now = Date.now();
  return MATCHES.filter(m => m.status === 'live' && (!m._lu || (now - new Date(m._lu).getTime()) < 30 * 60000));
}
// TODOS los partidos EN VIVO ahora mismo (tabla matches), EXCEPTO el destacado.
// Así "EN VIVO AHORA" refleja los 2, 3, los que haya, con su marcador.
function _computeSimultaneous(featured) {
  const fh = _normName(featured.home.name), fa = _normName(featured.away.name);
  return _liveTableMatches()
    .filter(m => !(_normName(m.home.name) === fh && _normName(m.away.name) === fa))
    .map(_liveCardFrom);
}

// ── Selector "EN VIVO AHORA" (destacado + simultáneos) ────────────────────
function renderLiveSwitcher() {
  const el = document.getElementById('live-switcher');
  if (!el) return;
  if (!_isActuallyLive() || !_simulLive.length || !_featuredMatch) {
    el.style.display = 'none'; el.innerHTML = ''; return;
  }
  const all = [_featuredMatch, ..._simulLive];
  const cur = LIVE_MATCH ? LIVE_MATCH.slug : _featuredMatch.slug;
  el.style.display = 'flex';
  el.innerHTML = `<span class="ls-label">${svgIcon('bolt', 13)} EN VIVO AHORA</span>` + all.map(m => `
    <button class="ls-chip${m.slug === cur ? ' active' : ''}" onclick="selectLiveMatch('${m.slug}')">
      <span class="ls-flags">${m.home.flag} ${m.away.flag}</span>
      <span class="ls-teams">${m.home.name} <b>${m.hs ?? 0}-${m.as ?? 0}</b> ${m.away.name}</span>
      <span class="ls-dot"></span>
    </button>`).join('');
}

function selectLiveMatch(slug) {
  if (!_featuredMatch) return;
  const all = [_featuredMatch, ..._simulLive];
  const m = all.find(x => x && x.slug === slug);
  if (!m) return;
  _userPickedSlug = (slug === _featuredMatch.slug) ? null : slug;
  LIVE_MATCH = m;
  CHANNELS = resolveMatchStreams(slug, _liveChannelDefs);
  LIVE_MATCH.defaultChannel = CHANNELS[0]?.id;
  _activeChannel = null;
  renderHero();
  renderChannelStrip();
  renderChannelsGrid();
  renderLiveSwitcher();
  openLiveStream();
  _showToast(`📺 ${m.home.name} vs ${m.away.name}`, 'var(--blue)');
  trackEvent('live_switch', `${m.home.name}-${m.away.name}`);
}

// ── Calendario dinámico desde Supabase (tabla `matches`) ──────────────────
// El calendario es global y editable sin re-desplegar: vive en la tabla `matches`
// (sembrada del estático y auto-sincronizada por cron). Se lee FRESCO en cada
// apertura/retorno. Si Supabase falla o está vacío → respaldo: el MATCHES estático
// (y auto-siembra para la próxima vez). Así "siempre está actualizable" sin que
// nadie tenga que estar presente cada día.
let _matchesSeeded = false;
async function loadMatches() {
  try {
    const { data } = await sb.from('matches').select('*').order('kickoff', { ascending: true });
    if (data && data.length) {
      const mapped = data.map(r => ({
        id: r.id, kickoff: r.kickoff,
        home: { name: _normName(r.home_name), flag: r.home_flag || flagFor(_normName(r.home_name)) },
        away: { name: _normName(r.away_name), flag: r.away_flag || flagFor(_normName(r.away_name)) },
        status: r.status || 'scheduled',
        hs: (r.hs == null ? null : r.hs), as: (r.as_ == null ? null : r.as_),
        venue: r.venue || '', city: r.city || '', comp: r.comp || '', _lu: r.updated_at,
      }));
      MATCHES.length = 0; mapped.forEach(m => MATCHES.push(m));
      console.log('[TVContigo] Calendario:', MATCHES.length, 'partidos desde Supabase (fresco)');
    } else {
      console.log('[TVContigo] Calendario vacío en Supabase → respaldo estático + auto-siembra');
      _seedMatchesFromStatic();
    }
  } catch (e) {
    console.log('[TVContigo] Calendario: sin conexión → respaldo estático');
  }
}
// Siembra la tabla `matches` con el calendario estático (una sola vez, idempotente).
function _seedMatchesFromStatic() {
  if (_matchesSeeded) return;
  _matchesSeeded = true;
  try {
    const payload = MATCHES.map((m, i) => ({
      id: m.id, kickoff: m.kickoff, home_name: m.home.name, home_flag: m.home.flag,
      away_name: m.away.name, away_flag: m.away.flag, status: m.status,
      hs: m.hs, as_: m.as, venue: m.venue || '', city: m.city || '', comp: m.comp || '', sort_order: i,
    }));
    sb.rpc('seed_matches', { p: payload }).then(
      ({ data }) => console.log('[TVContigo] Calendario sembrado en Supabase:', data, 'partidos'),
      () => {});
  } catch (e) {}
}

// ── Fuentes de transmisión configuradas por el operador (Supabase, global) ─
// El admin registra aquí embeds AUTORIZADOS. Si no hay ninguno activo para un
// partido, el player muestra el placeholder "sin fuente" (nunca pantalla negra).
let STREAM_SOURCES_LIVE = [];
async function loadStreamSources() {
  try {
    const { data } = await sb.from('stream_sources').select('*');
    STREAM_SOURCES_LIVE = Array.isArray(data) ? data : [];
    console.log('[TVContigo] Fuentes configuradas:', STREAM_SOURCES_LIVE.filter(s => s.active && s.embed_url).length, 'activas /', STREAM_SOURCES_LIVE.length, 'totales');
  } catch (e) { STREAM_SOURCES_LIVE = STREAM_SOURCES_LIVE || []; }
}
// ¿Hay una fuente configurada+activa para este canal (global o para el partido)?
function sourceForChannel(channelId, slug) {
  if (!Array.isArray(STREAM_SOURCES_LIVE)) return null;
  return STREAM_SOURCES_LIVE.find(s => s.channel_id === channelId && s.active && s.embed_url
    && (s.match_slug === '' || s.match_slug === slug)) || null;
}

// ── Resultados finales desde Supabase (overlay sobre MATCHES estático) ───
async function loadMatchResults() {
  try {
    const { data } = await sb.from('match_results').select('kickoff, hs, as_, status');
    if (data && data.length) {
      data.forEach(r => {
        const kt = new Date(r.kickoff).getTime();
        const m = MATCHES.find(x => Math.abs(new Date(x.kickoff).getTime() - kt) < 60000);
        if (m) { m.hs = r.hs; m.as = r.as_; m.status = r.status; }
      });
    }
  } catch (e) {}
  // Resultado reciente: partido terminado con kickoff en las últimas 6h
  const nowTs = Date.now();
  const fresh = MATCHES
    .filter(m => m.status === 'finished' && m.hs != null
               && new Date(m.kickoff).getTime() < nowTs
               && new Date(m.kickoff).getTime() > nowTs - 6 * 3600000)
    .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff));
  RECENT_RESULT = fresh[0] || null;
}

// ── Auto-refresco autónomo: la página se actualiza sola cuando cambia el ──
// ── partido o sus canales, sin recargar ni que nadie toque nada ───────────
let _liveRefresh = null;
function startLiveRefresh() {
  if (_liveRefresh) return;
  _liveRefresh = setInterval(refreshLiveConfig, 20000);  // cada 20s
}
async function refreshLiveConfig() {
  const before = _curSlug;
  await loadMatches();        // marcadores/estados EN VIVO frescos de TODOS los partidos
  await loadLiveConfig();
  await loadMatchResults();
  if (_curSlug !== before) {
    _activeChannel = null;
    if (_matchDataPoll) { clearInterval(_matchDataPoll); _matchDataPoll = null; }
    MATCH_LIVE_DATA = null;
    renderHero();
    renderChannelStrip();
    renderChannelsGrid();
  } else if (LIVE_MATCH && _isActuallyLive() && !_userPickedSlug) {
    // Mismo partido destacado — actualiza su marcador (no si el usuario eligió un simultáneo)
    const scoreEl = document.getElementById('hero-score');
    if (scoreEl) scoreEl.textContent = `${LIVE_MATCH.hs ?? 0}-${LIVE_MATCH.as ?? 0}`;
    _updateMediaSession();
  }
  renderLiveSwitcher();
  renderMatchesRow();
  renderResultsRow();
  renderStandings();
}

// ── Actualización de datos al abrir / volver a la app (con cooldown) ────────
// Trae partido en vivo, marcadores y resultados frescos cada vez que el usuario
// abre la web/PWA, vuelve a ella, o recupera conexión — sin recargar la página.
let _lastRefresh   = 0;
let _lastRefreshOk = 0;
let _refreshing    = false;
let _flashTimer    = null;
const REFRESH_COOLDOWN = 15000;   // máx. 1 actualización cada 15s (evita exceso, pero refresca al volver)

function setRefreshStatus(state, msg) {
  const dot   = document.getElementById('rs-dot');
  const label = document.getElementById('refresh-label');
  const btn   = document.getElementById('refresh-btn');
  if (label && msg) label.textContent = msg;
  if (dot) dot.className = 'rs-dot' + (state ? ' ' + state : '');
  if (btn) {
    if (state === 'busy') { btn.classList.add('spinning'); btn.disabled = true; }
    else { btn.classList.remove('spinning'); btn.disabled = false; }
  }
}

function updateLastRefreshLabel() {
  const label = document.getElementById('refresh-label');
  if (!label || !_lastRefreshOk || _refreshing) return;
  const t = new Date(_lastRefreshOk).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  label.textContent = `Actualizado · ${t}`;
}

// Muestra un mensaje contextual breve ("Datos actualizados al abrir") y luego
// vuelve a la hora de última actualización.
function _flashRefreshMsg(msg) {
  if (!msg) { updateLastRefreshLabel(); return; }
  const label = document.getElementById('refresh-label');
  if (!label) return;
  label.textContent = msg;
  if (_flashTimer) clearTimeout(_flashTimer);
  _flashTimer = setTimeout(updateLastRefreshLabel, 2800);
}

// Mensaje visible breve según el disparador del refresco.
const _REFRESH_MSG = {
  'window-load':      'Datos actualizados al abrir',
  'pageshow-bfcache': 'Datos actualizados al volver',
  'visibilitychange': 'Datos actualizados al volver',
  'window-focus':     'Datos actualizados',
  'online':           'Conexión recuperada · datos actualizados',
  'day-changed':      'Nuevo día · datos actualizados',
  'manual':           'Datos actualizados',
};

async function refreshAppData(force = false, reason = 'manual') {
  const now = Date.now();
  if (_refreshing) { console.log('[TVContigo] Refresh ignorado (ya en curso):', reason); return; }
  if (!force && now - _lastRefresh < REFRESH_COOLDOWN) {
    console.log('[TVContigo] Refresh omitido por cooldown:', reason);
    updateLastRefreshLabel();
    return;
  }
  _lastRefresh = now;
  _refreshing  = true;
  console.log('[TVContigo] Refresh triggered:', reason);
  setRefreshStatus('busy', 'Actualizando datos…');
  try {
    console.log('[TVContigo] Fetching fresh data… (Supabase matches + live_config + match_results + ranking)');
    await loadMatches();         // calendario fresco (global, auto-sincronizado)
    await loadStreamSources();   // fuentes configuradas (global)
    await refreshLiveConfig();   // recarga live_config + match_results y re-renderiza
    // Si NO hay live, re-pinta "Partidos de hoy" (sin tocar un stream en curso)
    if (!_isActuallyLive()) renderHero();
    // Refresca también gamificación, canales, ranking y quiniela al abrir/volver
    renderChannelsGrid();
    renderRanking();
    renderQuinielaSection();
    awardDailyLogin();
    renderChallenges();
    renderPointsToday();
    renderRewards();
    _lastRefreshOk = Date.now();
    _refreshing = false;
    setRefreshStatus(_isActuallyLive() ? 'live' : '', null);
    _flashRefreshMsg(_REFRESH_MSG[reason] || null);
    updateLastRefreshLabel();
    console.log('[TVContigo] Render completed ·', _isActuallyLive() ? 'EN VIVO' : 'sin live', '· reason:', reason);
  } catch (e) {
    _refreshing = false;
    console.error('[TVContigo] Refresh failed:', reason, e);
    // Los datos previos (Supabase en caché + calendario estático) siguen en pantalla
    setRefreshStatus('error', 'No se pudo actualizar · usando último respaldo');
  }
}

// Refresca el texto relativo ("hace 2 min") cada 15s
setInterval(updateLastRefreshLabel, 15000);

// ── Cambio de día: evita que la PWA se quede pegada con los partidos de ayer ──
function _todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Fecha LOCAL (no UTC) de un kickoff ISO → para agrupar "los partidos de hoy"
function _localDateOf(iso) { return _todayStr(new Date(iso)); }
// Partidos cuya fecha local es hoy
function getTodayMatches() { return MATCHES.filter(m => _localDateOf(m.kickoff) === _todayStr()); }
// ¿Ya terminaron TODOS los partidos de hoy?
function areTodayMatchesFinished() {
  const today = getTodayMatches();
  return today.length > 0 && today.every(m => m.status === 'finished');
}
// Reinicia el estado diario (puntos del día y retos), conservando total y racha
function _resetDailyState() {
  try { const p = getUserPoints(); p.today = 0; _saveUserPoints(p); } catch (e) {}
  try { localStorage.removeItem('tvc_challenges_done'); } catch (e) {}
}
// Detecta el cambio de día. Si cambió (y no es la primera visita): limpia el
// estado diario y FUERZA un refresco completo. Devuelve true si forzó refresco.
function handleDayChange() {
  const today = _todayStr();
  const saved = localStorage.getItem('tvc_last_day');
  if (saved === today) return false;
  localStorage.setItem('tvc_last_day', today);
  if (saved === null) return false;      // primera visita → el 'load' ya refresca
  console.log('[TVContigo] Día cambiado:', saved, '→', today);
  _resetDailyState();
  setRefreshStatus(null, 'Nuevo día — actualizando partidos…');
  refreshAppData(true, 'day-changed');
  return true;
}

// Deep-link a un pronóstico: index.html#pred=<matchId> abre su modal al cargar
function _handlePredHash() {
  const id = (String(location.hash || '').match(/pred=([\w-]+)/) || [])[1];
  if (id && typeof openMatchPredictionModal === 'function') setTimeout(() => openMatchPredictionModal(id), 400);
}
window.addEventListener('hashchange', _handlePredHash);

// Disparadores: al cargar, al volver a la pestaña/PWA, al enfocar la ventana,
// al recuperar conexión, y al cambiar el día.
// handleDayChange() devuelve true si ya forzó el refresco.
window.addEventListener('load',   () => { if (!handleDayChange()) refreshAppData(true, 'window-load'); _handlePredHash(); });
window.addEventListener('online', () => { setRefreshStatus(null, 'Conexión recuperada…'); if (!handleDayChange()) refreshAppData(true, 'online'); });
window.addEventListener('focus',  () => { if (!handleDayChange()) refreshAppData(false, 'window-focus'); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && !handleDayChange()) refreshAppData(false, 'visibilitychange'); });

// BFCache (atrás/adelante): 'load' NO se dispara al restaurar la página desde la
// caché de ida-vuelta del navegador → el usuario veía un estado CONGELADO y viejo.
// 'pageshow' con persisted=true es la única señal fiable de ese caso: forzamos
// refresco y revisamos versión/SW. Esta es la causa #1 de "estados anteriores".
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;   // navegación normal → ya la cubre 'load'
  console.log('[TVContigo] pageshow desde BFCache → forzando refresco + chequeo de versión');
  checkAppVersion();
  if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration().then(r => { if (r) r.update(); });
  if (!handleDayChange()) refreshAppData(true, 'pageshow-bfcache');
});

// Revisión periódica (cada 5 min): cambio de día o partido en vivo → refresca
setInterval(() => { if (!handleDayChange() && _isActuallyLive()) refreshAppData(true, 'live-interval'); }, 5 * 60 * 1000);

// ── Forzar actualización TOTAL (limpia TODAS las cachés + SW + recarga) ────
// Para usuarios viejos con caché/SW pegado. Botón discreto en el footer.
async function forceHardRefresh() {
  try {
    setRefreshStatus('busy', 'Limpiando caché…');
    console.log('[TVContigo] Force hard refresh: limpiando todas las cachés y el SW');
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        try { await reg.update(); } catch (e) {}
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_DATA_CACHE' });
      }
    }
    // Recarga: el SW es network-first, así que vuelve con todo fresco
    window.location.reload();
  } catch (e) {
    console.error('[TVContigo] Force hard refresh falló:', e);
    setRefreshStatus('error', 'No se pudo limpiar caché');
  }
}
window.forceHardRefresh = forceHardRefresh;

// ── Ver en tu TV · Apóyanos · copiar enlace ────────────────────────────────
function copyTvLink() {
  const btn = document.getElementById('vt-copy-btn');
  const url = 'https://tvcontigo.site';
  const done = () => {
    if (!btn) return;
    btn.textContent = '¡Copiado! ✓'; btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copiar enlace'; btn.classList.remove('copied'); }, 2000);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done).catch(() => _fallbackCopy(url, done));
  } else { _fallbackCopy(url, done); }
}
function _fallbackCopy(text, cb) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand('copy'); cb && cb(); } catch (e) {}
  document.body.removeChild(ta);
}
function openSupport() {
  // El apoyo real al proyecto es la quiniela y la comunidad
  _showToast('❤️ ¡Gracias por apoyar TVContigo! Juega la quiniela 🏆', 'var(--orange)');
  scrollToSection('quiniela-section');
  trackEvent('support', 'click');
}

// Cerrar cualquier modal con la tecla Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
});

// ── Estado del Home ───────────────────────────────────────────────────────
// 'live' (player) · 'no-stream' (live sin transmisión) · 'no-live-upcoming' /
// 'day-finished' (vista Partidos de hoy). Cuando no hay live, el player se
// oculta y aparece la vista de pronóstico — nunca se queda pegado.
function getAppViewState() {
  if (_isActuallyLive()) return CHANNELS.length ? 'live' : 'no-stream';
  const now = Date.now();
  const hasUpcoming = MATCHES.some(m => m.status === 'scheduled' && new Date(m.kickoff).getTime() > now);
  if (areTodayMatchesFinished()) return 'day-finished';
  return hasUpcoming ? 'no-live-upcoming' : 'day-finished';
}

// Muestra/oculta los elementos del reproductor (botones, aviso, hint)
function _togglePlayerChrome(show) {
  ['player-actions', 'play-hint'].forEach(id => {
    const e = document.getElementById(id); if (e) e.style.display = show ? '' : 'none';
  });
  const cw = document.querySelector('.channel-warning');
  if (cw) cw.style.display = show ? '' : 'none';
}

// ── Hero ──────────────────────────────────────────────────────────────────
function renderHero() {
  console.log('[TVContigo] App state:', getAppViewState());
  const hero = document.getElementById('hero-section');
  const hoy  = document.getElementById('hoy-section');
  const rawLive = (LIVE_MATCH && LIVE_MATCH.status === 'live') ? LIVE_MATCH : null;
  const live    = rawLive && _isActuallyLive() ? rawLive : null;

  // ── Sin partido en vivo → vista "Partidos de hoy" (no dejar el player pegado)
  if (!live) {
    if (hero) hero.style.display = 'none';
    if (hoy)  { hoy.style.display = 'block'; renderHoySection(); }
    _togglePlayerChrome(false);
    renderIframeNotice(false);
    showMatchTabs(false);
    if (_scorePoll) { clearInterval(_scorePoll); _scorePoll = null; }
    return;
  }

  // ── Hay partido en vivo → player ──────────────────────────────────────────
  if (hero) hero.style.display = '';
  if (hoy)  hoy.style.display = 'none';
  _togglePlayerChrome(true);

  const match    = live;
  const isLive   = true, isRecent = false;
  const hasChannels = CHANNELS.length > 0;
  if (hasChannels) {
    _activeChannel = CHANNELS.find(c => c.id === match.defaultChannel) || CHANNELS[0];
  }

  const ft = fmtMatchTime(match.kickoff);
  const venueLine = match.venue ? `${match.venue} · ${match.city}` : match.comp;

  if (isLive) {
    hero.innerHTML = `
      <div class="hero-match-preview">
        <div class="hmp-badge${hasChannels ? '' : ' hmp-badge-next'}"><span class="hmp-dot"></span> ${hasChannels ? 'EN VIVO' : 'SIN TRANSMISIÓN'} · ${match.comp}</div>
        <div class="hmp-teams">
          <div class="hmp-team">
            <div class="hmp-flag">${match.home.flag}</div>
            <div class="hmp-name">${match.home.name.toUpperCase()}</div>
          </div>
          <div class="hmp-center">
            <div class="hmp-score" id="hero-score">${match.hs ?? 0}-${match.as ?? 0}</div>
            <div class="hmp-live-label">● EN VIVO</div>
          </div>
          <div class="hmp-team">
            <div class="hmp-flag">${match.away.flag}</div>
            <div class="hmp-name">${match.away.name.toUpperCase()}</div>
          </div>
        </div>
        <div class="hmp-venue">📍 ${venueLine}</div>
        ${hasChannels ? `
        <div class="hmp-actions">
          <button class="hmp-btn-watch" onclick="openLiveStream()">▶ Ver en vivo</button>
          <button class="hmp-btn-quiniela" onclick="goPronosticar()">🎯 Pronosticar</button>
        </div>` : `
        <div style="text-align:center;margin:8px 0 2px;">
          <div style="font-weight:700;color:var(--text);font-size:15px;">Transmisión no disponible por el momento</div>
          <div style="color:var(--text-dim);font-size:13px;margin-top:3px;">Consulta canales oficiales o vuelve más tarde.</div>
        </div>
        <div class="hmp-actions" style="flex-wrap:wrap;justify-content:center;">
          <button class="hmp-btn-watch" onclick="goPronosticar()">🎯 Pronosticar partido</button>
          <button class="hmp-btn-quiniela" onclick="scrollToSection('upcoming-section')">📅 Próximos partidos</button>
          <button class="hmp-btn-quiniela" onclick="location.href='quiniela.html'">🏆 Mi quiniela</button>
        </div>
        <div style="text-align:center;color:var(--text-muted);font-size:11px;margin-top:10px;line-height:1.5;">${typeof STREAM_LEGAL_NOTICE !== 'undefined' ? STREAM_LEGAL_NOTICE : ''}</div>`}
      </div>`;
    renderIframeNotice(false);
    startLiveScorePolling();
    startMatchDataPolling();
    _updateMediaSession();
    showMatchTabs(true);
  } else if (isRecent) {
    hero.innerHTML = `
      <div class="hero-match-preview">
        <div class="hmp-badge hmp-badge-result">✓ RESULTADO FINAL · ${match.comp}</div>
        <div class="hmp-teams">
          <div class="hmp-team">
            <div class="hmp-flag">${match.home.flag}</div>
            <div class="hmp-name">${match.home.name.toUpperCase()}</div>
          </div>
          <div class="hmp-center">
            <div class="hmp-score">${match.hs ?? 0} - ${match.as ?? 0}</div>
            <div class="hmp-live-label" style="color:var(--text-muted);letter-spacing:2px;">FINAL</div>
          </div>
          <div class="hmp-team">
            <div class="hmp-flag">${match.away.flag}</div>
            <div class="hmp-name">${match.away.name.toUpperCase()}</div>
          </div>
        </div>
        <div class="hmp-venue">📍 ${venueLine}</div>
        <div class="hmp-actions">
          <button class="hmp-btn-watch" style="background:var(--surface-3);color:var(--text-dim);" onclick="scrollToSection('standings-section')">📊 Ver tabla de grupos</button>
          <button class="hmp-btn-quiniela" onclick="location.href='quiniela.html'">🏆 La quiniela</button>
        </div>
      </div>`;
    renderIframeNotice(false);
    showMatchTabs(false);
  } else {
    // Próximo partido — nunca marcar como activo aunque el embed ya esté listo
    hero.innerHTML = `
      <div class="hero-match-preview">
        <div class="hmp-badge hmp-badge-next">
          ⏱ PRÓXIMO PARTIDO · ${match.comp}
        </div>
        <div class="hmp-teams">
          <div class="hmp-team">
            <div class="hmp-flag">${match.home.flag}</div>
            <div class="hmp-name">${match.home.name.toUpperCase()}</div>
          </div>
          <div class="hmp-center">
            <div class="hmp-score hmp-vs">vs</div>
            <div class="hmp-kickoff">${ft.day} · ${ft.time}</div>
          </div>
          <div class="hmp-team">
            <div class="hmp-flag">${match.away.flag}</div>
            <div class="hmp-name">${match.away.name.toUpperCase()}</div>
          </div>
        </div>
        <div class="hmp-venue">📍 ${venueLine}</div>
        <div class="hmp-actions">
          <button class="hmp-btn-quiniela" onclick="location.href='quiniela.html'">🏆 La quiniela</button>
        </div>
      </div>`;
    renderIframeNotice(false);
    showMatchTabs(false);
  }
}

// ── Vista "Partidos de hoy" (cuando NO hay partido en vivo) ────────────────
function renderHoySection() {
  const el = document.getElementById('hoy-section');
  if (!el) return;
  const now = Date.now();
  const upcoming = MATCHES
    .filter(m => (m.status === 'scheduled' || m.status === 'postponed') && new Date(m.kickoff).getTime() > now)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  const dayDone = areTodayMatchesFinished();
  const logged  = (typeof Auth !== 'undefined' && Auth.isLoggedIn && Auth.isLoggedIn());

  const title = dayDone ? 'LOS PARTIDOS DE HOY YA FINALIZARON' : 'PARTIDOS DE HOY';
  const subtitle = dayDone
    ? 'Consulta los ganadores y prepara tus próximos pronósticos.'
    : 'Pronostica antes del silbatazo inicial y suma puntos en el ranking.';

  // Bloque destacado: el próximo grupo (1–2 partidos a la misma hora)
  let featuredHtml = '';
  if (upcoming.length) {
    const nextKt = new Date(upcoming[0].kickoff).getTime();
    const featured = upcoming.filter(m => Math.abs(new Date(m.kickoff).getTime() - nextKt) < 5 * 60000).slice(0, 2);
    const isDouble = featured.length >= 2;
    const splitCta = isDouble ? `
      <button class="hoy-split-cta" onclick="_showToast('La pantalla dividida se activa cuando los dos partidos estén EN VIVO ⚽','var(--blue)')">
        ${svgIcon('tv', 15)} Ver los dos en pantalla dividida →
      </button>` : '';
    featuredHtml = `
      <div class="hoy-featured-label">${isDouble ? svgIcon('tv', 13) + ' DOS PARTIDOS A LA VEZ' : svgIcon('target', 13) + ' PRÓXIMO PRONÓSTICO'}</div>
      <div class="hoy-cards${isDouble ? ' hoy-cards-2' : ''}">${featured.map(_hoyCard).join('')}</div>
      ${splitCta}`;
  }

  const ctas = logged
    ? `<a class="hoy-cta hoy-cta-primary" href="quiniela.html">${svgIcon('trophy', 15)} Ir a mi quiniela</a>
       <button class="hoy-cta" onclick="scrollToSection('upcoming-section')">${svgIcon('target', 15)} Partidos disponibles</button>`
    : `<a class="hoy-cta hoy-cta-primary" href="cuenta.html">${svgIcon('star', 15)} Crear mi cuenta</a>
       <a class="hoy-cta" href="cuenta.html?tab=login">${svgIcon('login', 15)} Entrar</a>`;

  el.innerHTML = `
    <div class="hoy-head"><span class="hoy-hdot"></span><h2 class="hoy-title">${title}</h2></div>
    <p class="hoy-subtitle">${subtitle}</p>
    ${featuredHtml || `<div class="hoy-empty">${svgIcon('star', 20)} No hay partidos en vivo por ahora. Vuelve para los próximos encuentros.</div>`}
    <div class="hoy-ctas">${ctas}</div>`;
}

function _hoyCard(m) {
  const ft = fmtMatchTime(m.kickoff);
  const venue = [m.venue, m.city].filter(Boolean).join(' · ');
  const sb = statusBadge(m);
  const pst = getPredictionStatus(m);
  const mine = getUserPredictionForMatch(m.id);
  let actions;
  if (pst === 'finished') {
    actions = `<button class="hoy-btn-pred" onclick="renderResultsAndWinners('${m.id}')">${svgIcon('trophy', 14)} Ver ganadores</button>`;
  } else if (pst === 'locked') {
    actions = `<button class="hoy-btn-info" style="flex:1;opacity:.7;cursor:default" disabled>${svgIcon('check', 14)} Pronóstico cerrado</button>`;
  } else if (mine) {
    actions = `<button class="hoy-btn-pred" onclick="goPronosticar('${m.id}')">${svgIcon('target', 14)} Tu pick ${mine.hs}-${mine.as_} · Editar</button>`;
  } else {
    actions = `<button class="hoy-btn-pred" onclick="goPronosticar('${m.id}')">${svgIcon('target', 14)} Pronosticar</button>
               <button class="hoy-btn-info" onclick="openMatchInfo('${m.id}')">${svgIcon('bolt', 14)} Recordar</button>`;
  }
  const center = (pst === 'finished')
    ? `<div class="hoy-hh">${m.hs}-${m.as}</div><div class="hoy-dd">FINAL</div>`
    : `<div class="hoy-hh">${ft.time}</div><div class="hoy-dd">${ft.day}</div>`;
  return `
    <div class="hoy-card">
      <div class="hoy-card-top">
        <span class="hoy-phase">${m.comp || 'Mundial 2026'}</span>
        <span class="hoy-badge ${sb.cls}">${sb.text}</span>
      </div>
      <div class="hoy-card-main">
        <div class="hoy-team"><span class="hoy-flag">${m.home.flag}</span><span class="hoy-tname">${m.home.name}</span></div>
        <div class="hoy-when">${center}</div>
        <div class="hoy-team"><span class="hoy-flag">${m.away.flag}</span><span class="hoy-tname">${m.away.name}</span></div>
      </div>
      ${venue ? `<div class="hoy-venue">📍 ${venue}</div>` : ''}
      <div class="hoy-card-actions">${actions}</div>
    </div>`;
}

// "Pronosticar": con matchId abre el modal de pronóstico del partido (o los
// ganadores si ya terminó). Sin matchId → a Mi quiniela (o crear cuenta).
function goPronosticar(matchId) {
  if (matchId) { openMatchPredictionModal(matchId); return; }
  if (typeof Auth !== 'undefined' && Auth.isLoggedIn && Auth.isLoggedIn()) location.href = 'quiniela.html';
  else location.href = 'cuenta.html';
}

// ══ Pronósticos por PARTIDO (recreativo · puntos · localStorage) ═══════════
// Estado: 'open' (antes del inicio) · 'locked' (ya inició) · 'finished'.
function getPredictionStatus(m) {
  if (m.status === 'finished') return 'finished';
  if (new Date(m.kickoff).getTime() <= Date.now()) return 'locked';
  return 'open';
}
function isPredictionOpen(m) { return getPredictionStatus(m) === 'open'; }
function _getPredictions() {
  try { return JSON.parse(localStorage.getItem('tvc_predictions') || '{}'); } catch (e) { return {}; }
}
function getUserPredictionForMatch(matchId) { return _getPredictions()[matchId] || null; }
function saveMatchPrediction(matchId, hs, as_) {
  const all = _getPredictions();
  all[matchId] = { matchId, hs, as_, submittedAt: new Date().toISOString() };
  try { localStorage.setItem('tvc_predictions', JSON.stringify(all)); } catch (e) {}
}

// Puntos del pronóstico al terminar el partido (recreativos)
function calculatePredictionPoints(pred, m) {
  if (m.hs == null || m.as == null) return 0;
  const S = PREDICTION_SCORING;
  let pts = S.participation;                       // participó antes del cierre
  const realW = m.hs > m.as ? 'h' : m.hs < m.as ? 'a' : 'd';
  const predW = pred.hs > pred.as_ ? 'h' : pred.hs < pred.as_ ? 'a' : 'd';
  const isDraw = realW === 'd';
  if (predW === realW) pts += S.correctWinner;     // ganador / empate correcto
  if (!isDraw && predW === realW && (pred.hs - pred.as_) === (m.hs - m.as)) pts += S.correctGoalDiff;
  if (pred.hs === m.hs && pred.as_ === m.as) pts += S.exactScore;   // marcador exacto
  return pts;
}

// Top de ganadores del partido (mock determinista + el pick real del usuario)
function calculateMatchWinners(matchId) {
  const m = MATCHES.find(x => x.id === matchId);
  if (!m || m.status !== 'finished' || m.hs == null) return [];
  const seeds = [[0, 0], [-1, 0], [0, 1], [1, 0], [-1, 1], [1, 1]];   // variaciones vs el real
  const rows = (typeof MOCK_PREDICTORS !== 'undefined' ? MOCK_PREDICTORS : []).map((u, i) => {
    const d = seeds[i % seeds.length];
    const ph = Math.max(0, m.hs + d[0]), pa = Math.max(0, m.as + d[1]);
    return { ...u, hs: ph, as_: pa, pts: calculatePredictionPoints({ hs: ph, as_: pa }, m) };
  });
  const mine = getUserPredictionForMatch(matchId);
  if (mine) rows.push({ id: 'me', name: 'Tú', avatar: '🫵', isMe: true, hs: mine.hs, as_: mine.as_, pts: calculatePredictionPoints({ hs: mine.hs, as_: mine.as_ }, m) });
  return rows.sort((a, b) => b.pts - a.pts);
}

// ── Modal de pronóstico por partido ───────────────────────────────────────
let _predMatch = null, _predHs = 0, _predAs = 0;
function openMatchPredictionModal(matchId) {
  const m = MATCHES.find(x => x.id === matchId);
  if (!m) return;
  const st = getPredictionStatus(m);
  if (st === 'finished') { renderResultsAndWinners(matchId); return; }
  if (st === 'locked') {
    const mine = getUserPredictionForMatch(matchId);
    _showToast(mine ? `🔒 Pronóstico cerrado · Tu pick: ${mine.hs}-${mine.as_}` : '🔒 Pronóstico cerrado · No registraste pronóstico', 'var(--surface-3)');
    return;
  }
  _predMatch = m;
  const ex = getUserPredictionForMatch(matchId);
  _predHs = ex ? ex.hs : 0;
  _predAs = ex ? ex.as_ : 0;
  _renderPredModal();
  openModal('pred-match-modal');
}
function _predStep(side, delta) {
  if (side === 'h') _predHs = Math.max(0, Math.min(20, _predHs + delta));
  else _predAs = Math.max(0, Math.min(20, _predAs + delta));
  _renderPredModalBody();
}
function _predQuick(kind) {
  if (kind === 'home') { _predHs = Math.max(1, _predHs); _predAs = Math.min(_predHs - 1, _predAs); if (_predAs < 0) _predAs = 0; if (_predHs <= _predAs) { _predHs = 2; _predAs = 1; } }
  else if (kind === 'draw') { const v = Math.max(_predHs, _predAs, 1); _predHs = v; _predAs = v; }
  else { _predAs = Math.max(1, _predAs); if (_predAs <= _predHs) { _predHs = 1; _predAs = 2; } }
  _renderPredModalBody();
}
function _renderPredModal() {
  const card = document.getElementById('pred-modal-card');
  if (!card || !_predMatch) return;
  const m = _predMatch;
  const ft = fmtMatchTime(m.kickoff);
  card.innerHTML = `
    <button class="modal-close" onclick="closeModal('pred-match-modal')">×</button>
    <div class="modal-title">Haz tu <span>pronóstico</span></div>
    <div class="pred-match-name">${m.home.flag} ${m.home.name} <b>vs</b> ${m.away.name} ${m.away.flag}</div>
    <div class="pred-close-note">${svgIcon('check', 12)} Cierra al silbatazo inicial · ${ft.day} ${ft.time}</div>
    <div id="pred-modal-body"></div>`;
  _renderPredModalBody();
}
function _renderPredModalBody() {
  const body = document.getElementById('pred-modal-body');
  if (!body || !_predMatch) return;
  const m = _predMatch;
  const S = PREDICTION_SCORING;
  const predW = _predHs > _predAs ? m.home.name : _predHs < _predAs ? m.away.name : 'Empate';
  body.innerHTML = `
    <div class="pred-score">
      <div class="pred-side">
        <div class="pred-flag">${m.home.flag}</div>
        <div class="pred-sname">${m.home.name}</div>
        <div class="pred-stepper">
          <button onclick="_predStep('h',-1)">−</button>
          <span class="pred-num">${_predHs}</span>
          <button onclick="_predStep('h',1)">+</button>
        </div>
      </div>
      <div class="pred-vs">-</div>
      <div class="pred-side">
        <div class="pred-flag">${m.away.flag}</div>
        <div class="pred-sname">${m.away.name}</div>
        <div class="pred-stepper">
          <button onclick="_predStep('a',-1)">−</button>
          <span class="pred-num">${_predAs}</span>
          <button onclick="_predStep('a',1)">+</button>
        </div>
      </div>
    </div>
    <div class="pred-quick">
      <button class="${predW === m.home.name ? 'on' : ''}" onclick="_predQuick('home')">Gana ${m.home.name}</button>
      <button class="${predW === 'Empate' ? 'on' : ''}" onclick="_predQuick('draw')">Empate</button>
      <button class="${predW === m.away.name ? 'on' : ''}" onclick="_predQuick('away')">Gana ${m.away.name}</button>
    </div>
    <div class="pred-preview">Tu pronóstico: <strong>${m.home.name} ${_predHs} - ${_predAs} ${m.away.name}</strong></div>
    <div class="pred-points">
      <div class="pred-points-title">Puntos posibles</div>
      <ul>
        <li><span>Participación</span><b>+${S.participation}</b></li>
        <li><span>Ganador correcto</span><b>+${S.correctWinner}</b></li>
        <li><span>Diferencia correcta</span><b>+${S.correctGoalDiff}</b></li>
        <li><span>Marcador exacto</span><b>+${S.exactScore}</b></li>
      </ul>
    </div>
    <button class="btn btn-orange btn-full" onclick="saveMatchPredictionFromModal()">Guardar pronóstico</button>
    <p class="pred-disclaimer">Los puntos son recreativos y no tienen valor monetario.</p>`;
}
function saveMatchPredictionFromModal() {
  if (!_predMatch) return;
  const m = _predMatch;
  saveMatchPrediction(m.id, _predHs, _predAs);
  closeModal('pred-match-modal');
  const logged = (typeof Auth !== 'undefined' && Auth.isLoggedIn && Auth.isLoggedIn());
  _showToast(`✅ Pronóstico guardado: ${m.home.name} ${_predHs}-${_predAs} ${m.away.name}` + (logged ? '' : ' · Crea tu cuenta para competir'), 'var(--green)');
  renderHero(); renderMatchesRow();
  trackEvent('prediction_match', m.id);
}

// ── Modal "Resultados y ganadores" (partido finalizado) ───────────────────
function renderResultsAndWinners(matchId) {
  const m = MATCHES.find(x => x.id === matchId);
  const card = document.getElementById('results-modal-card');
  if (!m || !card) return;
  const winners = calculateMatchWinners(matchId).slice(0, 5);
  const mine = getUserPredictionForMatch(matchId);
  const myPts = mine ? calculatePredictionPoints({ hs: mine.hs, as_: mine.as_ }, m) : null;
  const medal = ['🥇', '🥈', '🥉'];
  const exactBadge = (w) => (w.hs === m.hs && w.as_ === m.as) ? '<span class="rw-exact">Marcador exacto</span>' : '';
  const winnersHtml = winners.length
    ? winners.map((w, i) => `
        <div class="rw-row${w.isMe ? ' rw-me' : ''}">
          <span class="rw-pos">${medal[i] || (i + 1)}</span>
          <span class="rw-av">${w.avatar || '👤'}</span>
          <span class="rw-name">${esc(w.name)}${exactBadge(w)}</span>
          <span class="rw-pick">${w.hs}-${w.as_}</span>
          <span class="rw-pts">+${w.pts}</span>
        </div>`).join('')
    : `<div class="rw-empty">Aún no hay ganadores para este partido.</div>`;
  card.innerHTML = `
    <button class="modal-close" onclick="closeModal('results-modal')">×</button>
    <div class="modal-title">Resultados y <span>ganadores</span></div>
    <div class="rw-result">
      <div class="rw-team">${m.home.flag} ${m.home.name}</div>
      <div class="rw-score">${m.hs} - ${m.as}</div>
      <div class="rw-team">${m.away.name} ${m.away.flag}</div>
    </div>
    <div class="rw-final-badge">FINAL · ${m.comp || 'Mundial 2026'}</div>
    ${mine ? `<div class="rw-mine">Tu pronóstico: <strong>${mine.hs}-${mine.as_}</strong> · <span class="rw-mine-pts">+${myPts} pts</span></div>`
           : `<div class="rw-mine rw-mine-none">No registraste pronóstico para este partido.</div>`}
    <div class="rw-winners-title">${svgIcon('trophy', 14)} Ganadores del pronóstico</div>
    <div class="rw-winners">${winnersHtml}</div>
    <a class="btn btn-orange btn-full" href="quiniela.html" style="text-align:center;text-decoration:none;margin-top:6px;">Ver ranking completo</a>
    <p class="pred-disclaimer">Los puntos son recreativos y no tienen valor monetario.</p>`;
  openModal('results-modal');
  trackEvent('results_winners', matchId);
}

// ── Abre el stream (lazy — solo cuando el usuario hace clic) ──────────────
function openLiveStream() {
  if (!LIVE_MATCH) return;
  if (!CHANNELS.length) {
    _showToast('📡 Sin canales disponibles', 'var(--red)');
    return;
  }
  const ch = _activeChannel || CHANNELS[0];
  const m  = LIVE_MATCH;
  console.log('[TVContigo] Stream provider:', ch.name, ch.requiresAttribution ? '(autorizada, con atribución)' : '(canal del operador)');
  const hero = document.getElementById('hero-section');
  hero.innerHTML = `
    <iframe id="live-frame" src="${ch.url}" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      onload="onStreamLoaded()" onerror="onStreamError()"
      style="width:100%;height:100%;border:none;display:block;background:#000;"></iframe>
    <div id="stream-status" class="stream-status">
      <div class="ss-spinner"></div>
      <div class="ss-text">Conectando con la transmisión…</div>
    </div>
    <div class="hero-overlay"></div>
    <div class="hero-info">
      <div class="hero-meta">
        <div class="hero-live-badge"><span style="width:6px;height:6px;border-radius:50%;background:#fff;display:inline-block;"></span> EN VIVO · <span id="hero-ch-name">${ch.name}</span></div>
        <div class="hero-title">${m.home.flag} ${m.home.name} <span id="hero-score">${m.hs ?? 0}-${m.as ?? 0}</span> ${m.away.name} ${m.away.flag}</div>
        <div class="hero-subtitle">📍 ${m.venue || m.comp || ''}</div>
        ${ch.requiresAttribution && ch.attribution ? `<div class="hero-subtitle" style="font-size:11px;opacity:.85;margin-top:2px;">${ch.attribution}</div>` : ''}
      </div>
    </div>`;
  armStreamWatchdog();
  armHeroAutoHide();
  _startSilentKeepAlive();
  renderIframeNotice(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  trackEvent('live', 'watch');
}

// Actualiza el marcador en vivo cada 20s sin recargar la transmisión
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
        _updateMediaSession();
      }
    } catch (e) {}
  }, 20000);
}

// ── Media Session API (pantalla bloqueada / segundo plano) ────────────────
function _updateMediaSession() {
  if (!('mediaSession' in navigator)) return;
  if (LIVE_MATCH && _isActuallyLive()) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  `${LIVE_MATCH.home.name} ${LIVE_MATCH.hs ?? 0}-${LIVE_MATCH.as ?? 0} ${LIVE_MATCH.away.name}`,
      artist: 'TVContigo · EN VIVO',
      album:  LIVE_MATCH.comp || 'Mundial 2026',
      artwork: [
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
    });
    navigator.mediaSession.playbackState = 'playing';
    navigator.mediaSession.setActionHandler('play',  () => { navigator.mediaSession.playbackState = 'playing'; });
    navigator.mediaSession.setActionHandler('pause', () => { navigator.mediaSession.playbackState = 'paused'; });
    navigator.mediaSession.setActionHandler('stop',  () => { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; });
  } else {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  }
}

// ── Supabase Realtime: marcador en tiempo real (< 1s, sin polling) ───────────
let _realtimeChannel = null;
let _realtimeRetries  = 0;

function _subscribeRealtimeLive() {
  if (_realtimeChannel) return;
  _realtimeChannel = sb
    .channel('tvc-live-config')
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'live_config' },
      payload => {
        const d = payload.new;
        if (!d) return;
        if (d.status === 'live') {
          // Cambió el partido DESTACADO (otro juego arrancó) → recarga completa
          // al instante para mostrarlo con sus canales y recalcular simultáneos.
          if (d.slug && _featuredMatch && d.slug !== _featuredMatch.slug) {
            refreshLiveConfig();
            return;
          }
          // El usuario está viendo un partido SIMULTÁNEO → el marcador del
          // destacado no afecta su hero; lo ignoramos.
          if (_userPickedSlug) return;
          // Transición a EN VIVO (recién arrancó) → recarga para renderizarlo.
          if (!LIVE_MATCH || (d.slug && d.slug !== LIVE_MATCH.slug)) {
            refreshLiveConfig();
            return;
          }
          // Mismo partido destacado ya en vivo → solo actualiza el marcador (ligero).
          LIVE_MATCH.hs = d.hs; LIVE_MATCH.as = d.as_;
          const scoreEl = document.getElementById('hero-score');
          if (scoreEl) {
            const nv = `${d.hs ?? 0}-${d.as_ ?? 0}`;
            if (scoreEl.textContent !== nv) {
              scoreEl.textContent = nv;
              scoreEl.style.transition = 'transform .25s';
              scoreEl.style.transform = 'scale(1.25)';
              setTimeout(() => { scoreEl.style.transform = 'scale(1)'; }, 250);
            }
          }
          _updateMediaSession();
        } else {
          refreshLiveConfig();
        }
      })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        _realtimeRetries = 0;
      } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && _realtimeRetries < 6) {
        // Reconexión exponencial: 3s, 6s, 12s, 24s... máx 6 intentos
        const delay = 3000 * Math.pow(2, _realtimeRetries);
        _realtimeRetries++;
        sb.removeChannel(_realtimeChannel);
        _realtimeChannel = null;
        setTimeout(_subscribeRealtimeLive, delay);
      }
    });
}

window.addEventListener('pagehide', () => {
  if (_realtimeChannel) { sb.removeChannel(_realtimeChannel); _realtimeChannel = null; }
});

// ── Background audio keepalive (mantiene sesión activa en iOS segundo plano)
let _audioCtx = null;
let _silenceNode = null;

function _startSilentKeepAlive() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    if (_silenceNode) { try { _silenceNode.stop(); } catch(_e){} _silenceNode.disconnect(); }
    // Buffer de 1 segundo de silencio (amplitud 0) → mantiene la sesión de audio viva
    const buf = _audioCtx.createBuffer(1, _audioCtx.sampleRate, _audioCtx.sampleRate);
    _silenceNode = _audioCtx.createBufferSource();
    _silenceNode.buffer = buf;
    _silenceNode.loop = true;
    _silenceNode.connect(_audioCtx.destination);
    _silenceNode.start();
  } catch (e) {}
}

// Reactiva el AudioContext cuando el usuario vuelve desde segundo plano
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  // Audio: reactivar contexto suspendido en background
  if (_audioCtx) _audioCtx.resume().catch(() => {});
  // Realtime: reconectar si el canal fue matado (Android BFCache / iOS kill)
  if (!_realtimeChannel) _subscribeRealtimeLive();
  // Siempre sincronizar score al volver: cubre iOS (pagehide no siempre dispara)
  // y Android (puede haber llegado un gol mientras estaba en background)
  refreshLiveConfig();
});

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
  // OJO: los embeds cross-origin MUCHAS veces NO disparan "load" aunque el video
  // SÍ se esté reproduciendo. Por eso NO declaramos "no disponible" por timeout
  // (eso cortaba transmisiones que seguían al aire). Solo ocultamos el spinner y
  // dejamos ver la señal; el aviso real se reserva para onStreamError() (fallo
  // explícito). Las opciones de canal quedan abajo a la mano por si hay que cambiar.
  _streamWatchdog = setTimeout(() => {
    const s = document.getElementById('stream-status');
    if (s) s.classList.add('hidden');
  }, 9000);
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
  // Opciones alternativas a la mano (el partido suele traer ~7-12). Telemundo
  // va de primero por chRank, así que aparece arriba.
  const others = CHANNELS.filter(c => !_activeChannel || c.id !== _activeChannel.id).slice(0, 6);
  const alts = others.map(c =>
    `<button class="ss-alt" onclick="switchChannel('${c.id}')">${c.name}${c.option ? ' · ' + c.option : ''}</button>`).join('');
  ss.className = 'stream-status err';
  ss.innerHTML = `
    <div class="ss-icon">📡</div>
    <div class="ss-title">Esta opción no respondió</div>
    <div class="ss-sub">Prueba otra de las ${CHANNELS.length} opciones — <b>Telemundo</b> es la principal:</div>
    ${alts ? `<div class="ss-alts">${alts}</div>` : ''}
    <button class="ss-btn" onclick="retryStream()">↻ Reintentar esta opción</button>`;
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

// ── Channel Strip (selector rápido de canales) ─────────────────────────
function renderChannelStrip() {
  const strip = document.getElementById('channel-strip');
  if (!CHANNELS.length || !_isActuallyLive()) { strip.style.display = 'none'; return; }
  strip.style.display = 'flex';
  const canchaChip = `
    <div class="cancha-tv-chip${_canchaActive ? ' active' : ''}" onclick="openCanchaTV()">
      <span class="chip-name">📺 MULTI</span>
      <span class="chip-label">Multi-vista</span>
    </div>`;
  strip.innerHTML = canchaChip + CHANNELS.map((ch, i) => `
    <div class="channel-chip ${i === 0 && !_canchaActive ? 'active' : ''}" onclick="switchChannel('${ch.id}', this)">
      <span class="chip-name">${ch.name}</span>
      <span class="chip-label">${ch.option}</span>
      ${ch.tag ? _chipTag(ch.tag) : (ch.live ? '<span class="chip-live">● EN VIVO</span>' : '')}
    </div>
  `).join('');
}

// Devuelve el badge del canal con color según tipo (NO ADS verde, HD/4K azul)
function _chipTag(tag) {
  if (!tag) return '';
  const t = String(tag).toUpperCase();
  const cls = t.includes('NO ADS') ? ' tag-noads'
            : (t.includes('HD') || t.includes('4K') || t.includes('UHD')) ? ' tag-hd' : '';
  return `<span class="chip-tag${cls}">${tag}</span>`;
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
    openLiveStream();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  _showToast(`📺 ${ch.name} ${ch.option}`, 'var(--blue)');
  trackEvent('channel', ch.name);
  trackEvent('live', 'watch');
}

// ── Resultados Recientes + Próximos Partidos ─────────────────────────────
function renderMatchesRow() {
  const now = Date.now();

  // ── Resultados Recientes ──────────────────────────────────────────────
  const recentEl = document.getElementById('recent-results');
  if (recentEl) {
    const liveM = _isActuallyLive() ? LIVE_MATCH : null;
    const done  = MATCHES.filter(m => m.status === 'finished' && m.hs != null)
                    .sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff)).slice(0, 4);
    const list  = liveM ? [liveM, ...done].slice(0, 4) : done;

    recentEl.innerHTML = list.length ? list.map(m => {
      const isLive = m.status === 'live';
      const venue  = [m.venue, m.city].filter(Boolean).join(' · ');
      const click  = isLive
        ? `openLiveStream()`
        : `renderResultsAndWinners('${m.id}')`;
      return `
      <div class="ri-card${isLive ? ' ri-live' : ''}" onclick="${click}">
        <div class="ri-teams">
          <div class="ri-team"><span class="ri-flag">${m.home.flag}</span><span class="ri-name">${m.home.name}</span></div>
          <div class="ri-team"><span class="ri-flag">${m.away.flag}</span><span class="ri-name">${m.away.name}</span></div>
        </div>
        <div class="ri-scores">
          <span>${m.hs ?? 0}</span>
          <span>${m.as ?? 0}</span>
        </div>
        <div class="ri-info">
          <div class="ri-badge${isLive ? ' ri-live-badge' : ''}">${isLive ? '● EN VIVO' : 'FINAL'}</div>
          <div class="ri-sub">${venue || m.comp}</div>
        </div>
        <div class="ri-arrow">›</div>
      </div>`;
    }).join('') : '<p class="no-data">Sin resultados aún</p>';
  }

  // ── Próximos Partidos ─────────────────────────────────────────────────
  const upcomingEl = document.getElementById('upcoming-matches');
  if (upcomingEl) {
    const list = MATCHES.filter(m => (m.status === 'scheduled' || m.status === 'postponed')
                   && new Date(m.kickoff).getTime() > now)
                   .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).slice(0, 6);

    upcomingEl.innerHTML = list.length ? list.map(m => {
      const ft    = fmtMatchTime(m.kickoff);
      const venue = [m.venue, m.city].filter(Boolean).join(' · ');
      const sb    = statusBadge(m);
      return `
      <div class="up-card">
        <div class="up-status-badge ${sb.cls}">${sb.text}</div>
        <div class="up-main">
          <div class="up-teams">
            <div class="up-team"><span class="up-flag">${m.home.flag}</span><span class="up-name">${m.home.name}</span></div>
            <div class="up-team"><span class="up-flag">${m.away.flag}</span><span class="up-name">${m.away.name}</span></div>
          </div>
          <div class="up-timeblock">
            <div class="up-day">${ft.day}</div>
            <div class="up-time">${ft.time}</div>
            ${venue ? `<div class="up-venue">${venue}</div>` : ''}
          </div>
        </div>
        <button class="up-btn" onclick="goPronosticar('${m.id}'); event.stopPropagation()">PRONOSTICAR</button>
      </div>`;
    }).join('') : '<p class="no-data">No hay partidos próximos</p>';
  }
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

// ── Channels Grid — catálogo filtrable (referencia) + señal en vivo real ──
function renderChannelsGrid() {
  const grid = document.getElementById('channels-grid');
  if (!grid || typeof CHANNEL_CATALOG === 'undefined') return;

  // Canales realmente transmitiendo ahora (del partido en vivo) para marcarlos
  const liveList = _isActuallyLive() ? CHANNELS : [];
  const q = _chSearch.trim().toLowerCase();

  const list = CHANNEL_CATALOG.filter(c => {
    if (_chFilter !== 'all' && !c.groups.includes(_chFilter)) return false;
    if (q && !`${c.name} ${c.country} ${c.lang}`.toLowerCase().includes(q)) return false;
    return true;
  });

  if (!list.length) {
    grid.innerHTML = `<div class="ch-empty">Sin canales para este filtro o búsqueda.</div>`;
    return;
  }

  const slug = (LIVE_MATCH && LIVE_MATCH.slug) || '';
  grid.innerHTML = list.map(c => {
    const liveCh = liveList.find(x => _chMatch(x.name, c.name));
    const src    = sourceForChannel(c.id, slug);   // fuente AUTORIZADA configurada por el operador
    const avail  = !!liveCh;
    let stateClass, statusHtml, onclick;
    if (avail) {                                    // transmitiendo ahora
      stateClass = ' ch-avail';
      statusHtml = `<span class="ch-live-tag"><span class="ch-dot"></span>EN VIVO</span>`;
      onclick = `switchChannel('${liveCh.id}')`;
    } else if (src) {                               // fuente configurada y activa
      stateClass = ' ch-config';
      statusHtml = `<span class="ch-config-tag">CONFIGURADO</span>`;
      onclick = `channelUnavailable()`;
    } else {                                        // catálogo sin fuente
      stateClass = ' ch-ref';
      statusHtml = `<span class="ch-ref-tag">SIN FUENTE</span>`;
      onclick = `channelUnavailable()`;
    }
    const qBadge = (c.quality && c.quality !== 'HD') ? `<span class="ch-badge ch-badge-q">${c.quality}</span>` : '';
    return `
    <div class="ch-card${stateClass}" onclick="${onclick}">
      <div class="ch-card-top">
        <div class="ch-name">${c.name}</div>
        <span class="ch-badges">${qBadge}${c.badge ? `<span class="ch-badge ${_badgeClass(c.badge)}">${c.badge}</span>` : ''}</span>
      </div>
      <div class="ch-meta">${c.country} · ${c.lang}</div>
      <div class="ch-status">${statusHtml}</div>
    </div>`;
  }).join('');
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
  // Título dinámico según última jornada con resultados
  if (results.length) {
    const titleEl = document.getElementById('results-section-title');
    if (titleEl) titleEl.innerHTML = `<span class="dot"></span> RESULTADOS · ${results[0].comp.toUpperCase()}`;
  }
}

// ── Tabla de Grupos (clasificación calculada desde MATCHES) ───────────────
function renderStandings() {
  const el = document.getElementById('standings-groups');
  if (!el) return;

  // Acumular stats por grupo y equipo
  const groups = {};
  MATCHES.forEach(m => {
    [['home', m.home], ['away', m.away]].forEach(([side, t]) => {
      const g = MATCH_GROUPS[t.name];
      if (!g) return;
      if (!groups[g]) groups[g] = {};
      if (!groups[g][t.name]) groups[g][t.name] = { name: t.name, flag: t.flag, p:0, w:0, d:0, l:0, gf:0, ga:0 };
    });
    const g = MATCH_GROUPS[m.home.name];
    if (!g || m.status !== 'finished' || m.hs == null || m.as == null) return;
    const h = groups[g][m.home.name];
    const a = groups[g][m.away.name];
    if (!h || !a) return;
    h.p++; a.p++; h.gf += m.hs; h.ga += m.as; a.gf += m.as; a.ga += m.hs;
    if (m.hs > m.as)      { h.w++; a.l++; }
    else if (m.hs < m.as) { h.l++; a.w++; }
    else                  { h.d++; a.d++; }
  });

  el.innerHTML = 'ABCDEFGHIJKL'.split('').map(g => {
    if (!groups[g]) return '';
    const teams = Object.values(groups[g])
      .map(t => ({ ...t, pts: t.w * 3 + t.d, gd: t.gf - t.ga }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    return `<div class="std-group">
      <div class="std-group-hdr">GRUPO ${g}</div>
      <table class="std-table">
        <thead><tr>
          <th class="std-th-pos">#</th><th class="std-th-team">Equipo</th>
          <th>J</th><th>G</th><th>E</th><th>P</th><th>GD</th><th>Pts</th>
        </tr></thead>
        <tbody>${teams.map((t, i) => `<tr class="${i < 2 ? 'std-qualify' : ''}">
          <td class="std-td-pos">${i + 1}</td>
          <td class="std-td-team">${t.flag} ${t.name}</td>
          <td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td>
          <td>${t.gd > 0 ? '+' + t.gd : t.gd}</td>
          <td class="std-td-pts">${t.pts}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
  }).join('');
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
    // Prioridad del avatar en el ranking: foto subida → emoji elegido → iniciales
    const av = u.avatar
      ? `<div style="width:30px;height:30px;border-radius:50%;background-image:url('${u.avatar}');background-size:cover;background-position:center;flex-shrink:0;"></div>`
      : u.emoji
        ? `<div style="width:30px;height:30px;border-radius:50%;background:var(--surface-3);display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1;flex-shrink:0;">${esc(u.emoji)}</div>`
        : `<div style="width:30px;height:30px;border-radius:50%;background:var(--surface-3);color:var(--text-dim);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">${ini}</div>`;
    const lvl = (typeof levelFor === 'function') ? levelFor(u.pts || 0) : { name: '' };
    // Insignias pequeñas (decorativas): líder, racha y tino exacto
    const badges = [];
    if (i === 0) badges.push({ ic: 'trophy', cls: 'rb-top',  t: 'Líder' });
    if (i % 2 === 0) badges.push({ ic: 'fire', cls: 'rb-fire', t: 'Racha' });
    if (i === 1 || i === 4) badges.push({ ic: 'target', cls: 'rb-exact', t: 'Exacto' });
    const badgeHtml = badges.map(b => `<span class="rank-badge ${b.cls}" title="${b.t}">${svgIcon(b.ic, 12)}</span>`).join('');
    return `<div class="ranking-row">
      <div class="ranking-pos ${posClass[i] || ''}">${i + 1}</div>
      ${av}
      <div class="ranking-name">${esc(u.name)}<span class="ranking-level">${lvl.name}</span></div>
      <div class="rank-badges">${badgeHtml}</div>
      <div class="ranking-pts">${u.pts} <span style="font-size:11px;color:var(--text-dim)">pts</span></div>
    </div>`;
  }).join('');
}

// ── Iconos SVG inline (sin emojis para la UI nueva) ───────────────────────
const _ICONS = {
  login:  '<path d="M11 16l-4-4 4-4m-4 4h12M13 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4"/>',
  check:  '<path d="M5 13l4 4L19 7"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  trophy: '<path d="M8 21h8m-4-4v4m-5-15h10v3a5 5 0 01-10 0V6zM7 6H4v1a3 3 0 003 3m10-4h3v1a3 3 0 01-3 3"/>',
  fire:   '<path d="M12 3s4.5 3.5 4.5 8a4.5 4.5 0 01-9 0c0-1 .4-2 .4-2S7 9.5 7 12.5a5 5 0 0010 0C17 7 12 3 12 3z"/>',
  star:   '<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.6 1-5.8L3.5 9.7l5.9-.9z"/>',
  chart:  '<path d="M4 19V5m0 14h16M8 16v-4m4 4V8m4 8v-6"/>',
  ball:   '<circle cx="12" cy="12" r="9"/><path d="M12 7.5l3.8 2.8-1.5 4.5h-4.6L8.2 10.3z"/>',
  medal:  '<circle cx="12" cy="14.5" r="5.5"/><path d="M9 9.5L7 2m10 7.5L19 2M12 12l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9 14.1l2-.3z"/>',
  crown:  '<path d="M3 18h18M4.5 18l-1.5-9 5 3.5 4-6.5 4 6.5 5-3.5-1.5 9z"/>',
  badge:  '<circle cx="12" cy="9" r="5"/><path d="M9 13.5L8 21l4-2 4 2-1-7.5"/>',
  frame:  '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="2"/><path d="M21 16l-5-5L5 21"/>',
  list:   '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0"/>',
  ticket: '<path d="M3 8a2 2 0 012-2h14a2 2 0 012 2 2 2 0 000 4 2 2 0 000 4 2 2 0 01-2 2H5a2 2 0 01-2-2 2 2 0 000-4 2 2 0 000-4z"/>',
  share:  '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  tv:     '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  bolt:   '<path d="M13 2L4.5 13.5H11l-1 8.5L18.5 10H12z"/>',
};
function svgIcon(name, size = 16) {
  return `<svg class="ic" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${_ICONS[name] || _ICONS.star}</svg>`;
}

// ── Puntos del usuario (RECREATIVO · mock local en localStorage) ───────────
// Estructura lista para conectar a backend luego (RPC tipo award_points).
function getUserPoints() {
  let p;
  try { p = JSON.parse(localStorage.getItem('tvc_points') || '{}'); } catch (e) { p = {}; }
  if (typeof p.total !== 'number') p = { total: 0, today: 0, streak: 0, lastDay: '', rewards: [] };
  return p;
}
function _saveUserPoints(p) { try { localStorage.setItem('tvc_points', JSON.stringify(p)); } catch (e) {} }
function _dayKey(d = new Date()) { return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

// Suma el login diario (1 vez/día) y mantiene la racha. Solo si hay sesión.
function awardDailyLogin() {
  if (!Auth.isLoggedIn()) return;
  const p = getUserPoints();
  const today = _dayKey();
  if (p.lastDay === today) return;
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  p.streak = (p.lastDay === _dayKey(yest)) ? (p.streak || 0) + 1 : 1;
  p.lastDay = today;
  p.today = 5 + (p.streak > 1 ? 5 : 0);       // login +5, racha +5
  p.total = (p.total || 0) + p.today;
  _saveUserPoints(p);
}

// ── Render: Puntos de hoy ──────────────────────────────────────────────────
function renderPointsToday() {
  const el = document.getElementById('points-today');
  if (!el) return;
  const rules = POINTS_RULES.map(r => `
    <li class="pt-rule">
      <span class="pt-ic">${svgIcon(r.icon, 14)}</span>
      <span class="pt-label">${r.label}</span>
      <span class="pt-pts">+${r.points}</span>
    </li>`).join('');
  if (!Auth.isLoggedIn()) {
    el.innerHTML = `
      <ul class="pt-rules">${rules}</ul>
      <div class="pt-locked">
        <p>Inicia sesión para guardar tus puntos y entrar al ranking.</p>
        <button class="btn btn-orange btn-sm" onclick="openModal('login-modal')">Entrar / Registrarme</button>
      </div>`;
    return;
  }
  const p = getUserPoints();
  const today = p.today || 0;
  const pct = Math.min(100, Math.round(today / DAILY_MAX * 100));
  el.innerHTML = `
    <ul class="pt-rules">${rules}</ul>
    <div class="pt-progress-wrap">
      <div class="pt-progress-top"><span>Tu progreso de hoy</span><strong>${today} / ${DAILY_MAX} pts</strong></div>
      <div class="pt-bar"><div class="pt-bar-fill" style="width:${pct}%"></div></div>
      ${p.streak > 1 ? `<div class="pt-streak">${svgIcon('fire', 13)} Racha de ${p.streak} días activa · +5 pts extra</div>` : ''}
    </div>`;
}

// ── Render: Recompensas (niveles + simbólicas) ─────────────────────────────
function renderRewards() {
  const el = document.getElementById('rewards-module');
  if (!el) return;
  const total = Auth.isLoggedIn() ? (getUserPoints().total || 0) : 0;
  const cur = levelFor(total);
  const levels = REWARD_LEVELS.map(l => {
    const active = l.name === cur.name;
    const reached = total >= l.min;
    const range = l.max === Infinity ? `${l.min}+ pts` : `${l.min}–${l.max} pts`;
    return `<div class="rw-level${active ? ' active' : ''}${reached ? ' reached' : ''}">
      <span class="rw-ic">${svgIcon(l.icon, 16)}</span>
      <div class="rw-meta"><div class="rw-name">${l.name}</div><div class="rw-range">${range}</div></div>
      ${active ? '<span class="rw-tag">TÚ</span>' : (reached ? `<span class="rw-chk">${svgIcon('check', 13)}</span>` : '')}
    </div>`;
  }).join('');
  const items = REWARD_ITEMS.map(r => `<li>${svgIcon(r.icon, 13)} ${r.label}</li>`).join('');
  el.innerHTML = `
    <div class="rw-levels">${levels}</div>
    <div class="rw-items-title">Recompensas simbólicas</div>
    <ul class="rw-items">${items}</ul>
    <div class="rw-disclaimer">${svgIcon('star', 12)} Los puntos y recompensas son de entretenimiento. No tienen valor monetario.</div>`;
}

// ── Render: Retos del día ──────────────────────────────────────────────────
function renderChallenges() {
  const el = document.getElementById('challenges-list');
  if (!el) return;
  const rows = DAILY_CHALLENGES.map(c => `
    <div class="cc-row">
      <span class="cc-ic">${svgIcon(c.icon, 15)}</span>
      <span class="cc-label">${c.label}</span>
      <span class="cc-pts">+${c.points} pts</span>
    </div>`).join('');
  const lock = Auth.isLoggedIn() ? '' : `
    <div class="cc-locked">
      <span>Inicia sesión para completar retos.</span>
      <button class="btn btn-orange btn-sm" onclick="openModal('login-modal')">Entrar</button>
    </div>`;
  // Apartado: recordatorio diario (push PWA + correo si hay sesión)
  const on = localStorage.getItem('tvc_reminders') === '1' &&
             (typeof Notification === 'undefined' || Notification.permission === 'granted');
  const reminder = on
    ? `<div class="cc-reminder cc-reminder-on">
         <span>${svgIcon('check', 14)} Recordatorio diario activado</span>
         <button class="cc-rem-off" onclick="disableDailyReminder()">Desactivar</button>
       </div>`
    : `<button class="cc-reminder-btn" onclick="enableDailyReminder()">
         ${svgIcon('bolt', 15)} 🔔 Recordarme mis retos cada día
       </button>`;
  el.innerHTML = rows + lock + reminder;
}

// Activa el recordatorio diario: avisos PWA (push) + correo de confirmación
async function enableDailyReminder() {
  if (typeof subscribePush === 'function') {
    try { await subscribePush(); } catch (e) {}
  }
  const ok = (typeof Notification !== 'undefined' && Notification.permission === 'granted');
  if (!ok) { _showToast('Activa las notificaciones para recibir el recordatorio', 'var(--red)'); return; }
  localStorage.setItem('tvc_reminders', '1');
  _showToast('🔔 Recordatorio diario activado — te avisaremos de tus retos', 'var(--green)');
  // Correo de confirmación: solo con sesión y una sola vez
  if (Auth.isLoggedIn() && !localStorage.getItem('tvc_reminder_email')) {
    try { await sb.rpc('send_reminder_email'); localStorage.setItem('tvc_reminder_email', '1'); } catch (e) {}
  }
  renderChallenges();
  trackEvent('reminder', 'on');
}
function disableDailyReminder() {
  localStorage.removeItem('tvc_reminders');
  _showToast('Recordatorio diario desactivado', 'var(--surface-3)');
  renderChallenges();
  trackEvent('reminder', 'off');
}

// ── Catálogo "Todos los canales": filtros + búsqueda (referencia legal) ────
let _chFilter = 'all';
let _chSearch = '';
function _norm(n) { return String(n || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function _chMatch(a, b) { const x = _norm(a), y = _norm(b); return !!x && !!y && (x === y || x.startsWith(y) || y.startsWith(x)); }
function _badgeClass(b) {
  const t = String(b).toUpperCase();
  if (t.includes('NO ADS')) return 'b-noads';
  if (t.includes('4K') || t.includes('HD')) return 'b-hd';
  if (t.includes('GRATIS')) return 'b-free';
  return 'b-partido';
}
function renderChannelFilters() {
  const bar = document.getElementById('channel-filters');
  if (!bar || typeof CHANNEL_FILTERS === 'undefined') return;
  bar.innerHTML = CHANNEL_FILTERS.map(f =>
    `<button class="ch-filter${f.id === _chFilter ? ' active' : ''}" onclick="setChannelFilter('${f.id}', this)">${f.label}</button>`
  ).join('');
}
function setChannelFilter(id, el) {
  _chFilter = id;
  document.querySelectorAll('.ch-filter').forEach(b => b.classList.toggle('active', b === el));
  renderChannelsGrid();
}
function searchChannelCatalog(q) { _chSearch = q || ''; renderChannelsGrid(); }
function channelUnavailable() {
  _showToast('Transmisión no disponible por el momento. Consulta canales oficiales o vuelve más tarde.', 'var(--surface-3)');
}

// ── Predicción (sustituye "Apóyanos") ──────────────────────────────────────
function openPrediction() {
  openModal('prediction-modal');
  trackEvent('prediction', 'open');
}
function predictionHowto() {
  closeModal('prediction-modal');
  scrollToSection('gamify-section');
}

// ── Ad Carousel (multi-anuncio con rotación automática) ───────────────────
let _adCarouselTimer = null;
let _adsActive       = [];
let _adCarouselIdx   = 0;

async function loadAdSettings() {
  const adBar = document.getElementById('ad-bar');
  try {
    const { data: cfg } = await sb.from('ad_config').select('enabled').eq('id', 1).single();
    if (!cfg || !cfg.enabled) { adBar.classList.add('hidden'); return; }

    const { data: ads } = await sb.from('ads').select('*').eq('active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!ads || !ads.length) { adBar.classList.add('hidden'); return; }

    _adsActive     = ads;
    _adCarouselIdx = 0;
    if (_adCarouselTimer) { clearInterval(_adCarouselTimer); _adCarouselTimer = null; }

    _renderAdSlide(0);

    if (ads.length > 1) {
      _renderAdDots(ads.length);
      _adCarouselTimer = setInterval(() => {
        _adCarouselIdx = (_adCarouselIdx + 1) % _adsActive.length;
        _renderAdSlide(_adCarouselIdx);
        _updateAdDots(_adCarouselIdx);
      }, 6000);
    }
  } catch (e) { /* mantiene el placeholder */ }
}

function _renderAdSlide(idx) {
  const adContent = document.getElementById('ad-content');
  const ad = _adsActive[idx];
  if (!ad) return;
  const isMobile = window.matchMedia('(max-width:640px)').matches;
  const img = isMobile ? (ad.mobile_img || ad.desktop_img) : (ad.desktop_img || ad.mobile_img);
  if (!img) return;
  adContent.style.opacity    = '0';
  adContent.style.transition = 'opacity .25s';
  setTimeout(() => {
    adContent.innerHTML = `<a href="${ad.link_url || '#'}" target="_blank" rel="noopener"
      style="display:flex;align-items:center;justify-content:center;height:100%;">
      <img src="${img}" alt="${ad.title || 'anuncio'}"
        style="max-height:58px;max-width:100%;border-radius:6px;">
    </a>`;
    adContent.style.opacity = '1';
  }, 150);
}

function _renderAdDots(count) {
  let dots = document.getElementById('ad-dots');
  if (!dots) {
    dots = document.createElement('div');
    dots.id = 'ad-dots';
    dots.style.cssText =
      'position:absolute;bottom:3px;left:50%;transform:translateX(-50%);display:flex;gap:4px;pointer-events:none;';
    document.getElementById('ad-bar').appendChild(dots);
  }
  dots.innerHTML = Array.from({ length: count }, (_, i) =>
    `<span data-dot="${i}" style="display:inline-block;width:5px;height:5px;border-radius:50%;` +
    `background:${i === 0 ? 'var(--blue)' : 'rgba(255,255,255,.3)'};transition:background .3s;"></span>`
  ).join('');
}

function _updateAdDots(idx) {
  document.querySelectorAll('#ad-dots span').forEach((s, i) => {
    s.style.background = i === idx ? 'var(--blue)' : 'rgba(255,255,255,.3)';
  });
}

function closeAd() {
  if (_adCarouselTimer) { clearInterval(_adCarouselTimer); _adCarouselTimer = null; }
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

// ── Multi Vista — varios canales a la vez ──────────────────────────────────
let _canchaActive = false;
let _canchaLayout = 2;
const _canchaSel  = [0, 1, 2, 3]; // índice de canal por panel

function openCanchaTV() {
  _canchaActive = true;
  document.getElementById('cancha-tv').style.display = 'block';
  document.getElementById('hero-section').style.display = 'none';
  const ph = document.getElementById('play-hint');
  if (ph) ph.style.display = 'none';
  document.getElementById('channel-strip').style.display = 'none';
  // Actualizar chip activo
  document.querySelectorAll('.cancha-tv-chip').forEach(c => c.classList.add('active'));
  _renderCanchaGrid();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  trackEvent('cancha_tv', 'open');
}

function closeCanchaTV() {
  _canchaActive = false;
  document.getElementById('cancha-tv').style.display = 'none';
  document.getElementById('hero-section').style.display = '';
  const ph = document.getElementById('play-hint');
  if (ph) ph.style.display = '';
  renderChannelStrip(); // re-renders strip (restores visibility)
  document.querySelectorAll('.cancha-tv-chip').forEach(c => c.classList.remove('active'));
  // Destruir iframes para liberar memoria
  document.getElementById('cancha-grid').innerHTML = '';
}

function setCanchaLayout(n) {
  _canchaLayout = n;
  document.querySelectorAll('.cv-btn').forEach(b => {
    b.classList.toggle('active', b.id === `cv-${n}`);
  });
  const grid = document.getElementById('cancha-grid');
  grid.className = `cancha-grid layout-${n}`;
  _renderCanchaGrid();
}

function _renderCanchaGrid() {
  if (!_canchaActive) return;
  const grid = document.getElementById('cancha-grid');
  grid.className = `cancha-grid layout-${_canchaLayout}`;
  const count = _canchaLayout;

  let html = '';
  for (let i = 0; i < count; i++) {
    const idx = Math.min(_canchaSel[i], CHANNELS.length - 1);
    const ch  = CHANNELS[idx];
    const options = CHANNELS.map((c, ci) =>
      `<option value="${ci}"${ci === idx ? ' selected' : ''}>${c.name} · ${c.option}</option>`
    ).join('');

    if (!ch) {
      html += `<div class="cancha-panel">
        <div class="cp-no-signal">
          <div class="cp-icon">📡</div>
          <div class="cp-msg">No hay transmisión activa en este momento</div>
        </div>
        <div class="cp-num">P${i+1}</div>
      </div>`;
      continue;
    }

    html += `<div class="cancha-panel" id="cp-${i}">
      <div class="cp-top">
        <select class="cp-select" onchange="changeCanchaChannel(${i},+this.value)">${options}</select>
        <div class="cp-badge"><div class="cp-badge-dot"></div>EN VIVO</div>
      </div>
      <div class="cp-iframe-wrap">
        <iframe class="cp-iframe"
          src="${ch.url}"
          allowfullscreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"></iframe>
      </div>
      <div class="cp-num">P${i+1}</div>
    </div>`;
  }
  grid.innerHTML = html;
}

function changeCanchaChannel(panelIdx, channelIdx) {
  _canchaSel[panelIdx] = channelIdx;
  const ch = CHANNELS[channelIdx];
  if (!ch) return;
  const panel = document.getElementById(`cp-${panelIdx}`);
  if (!panel) return;
  const iframe = panel.querySelector('.cp-iframe');
  if (iframe) iframe.src = ch.url;
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
  const homeId = data?.home_team_id ?? null;
  const awayId = data?.away_team_id ?? null;
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
    // Determinar bandera del equipo
    const evTeamId = ev.team?.id ?? null;
    let teamFlag = '';
    if (homeId !== null && evTeamId !== null && evTeamId === homeId) {
      teamFlag = LIVE_MATCH?.home?.flag || '';
    } else if (awayId !== null && evTeamId !== null && evTeamId === awayId) {
      teamFlag = LIVE_MATCH?.away?.flag || '';
    } else if (ev.team?.name) {
      // Fallback: comparación parcial de nombre (español vs inglés)
      const tn = (ev.team.name || '').toLowerCase();
      const hn = (LIVE_MATCH?.home?.name || '').toLowerCase();
      const firstWord = hn.split(' ')[0];
      teamFlag = (firstWord && tn.includes(firstWord))
        ? (LIVE_MATCH?.home?.flag || '')
        : (LIVE_MATCH?.away?.flag || '');
    }
    const isGoal = type.toLowerCase().includes('goal') || detail.toLowerCase().includes('goal');
    return `<div class="crono-row${isGoal ? ' crono-goal' : ''}">
      <div class="crono-min">${elapsed}${extra}'</div>
      <div class="crono-icon">${icon}</div>
      <div class="crono-player">${esc(player)}<span class="crono-detail">${esc(detail || type)}</span></div>
      <div class="crono-flag">${teamFlag}</div>
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
  _matchDataPoll = setInterval(loadMatchLiveData, 20000);
}
