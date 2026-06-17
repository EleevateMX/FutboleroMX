// ── TVContigo — Notificaciones Push ───────────────────────────────────────
const VAPID_PUBLIC = 'BKKsYVRpYFTuHSDxqTyjFOqJq5kY80Vj_ES3Hl_N6Momnx4xtiv-rOhLJ9eYUiZaciKQ-HOxToTuLzPIFE7XgL0';

function urlB64ToUint8(s) {
  const pad = '='.repeat((4 - s.length % 4) % 4);
  const b = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
function sameKey(sub) {
  try {
    const c = urlB64ToUint8(VAPID_PUBLIC);
    const k = sub && sub.options && sub.options.applicationServerKey;
    if (!k) return false;
    const a = new Uint8Array(k);
    if (a.length !== c.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== c[i]) return false;
    return true;
  } catch (e) { return false; }
}
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// Guarda la suscripción vía RPC SECURITY DEFINER (sin depender de RLS)
async function saveSubscription(sub) {
  try {
    const j = sub.toJSON();
    const { error } = await sb.rpc('save_push_subscription', {
      p_endpoint: sub.endpoint,
      p_p256dh: j.keys.p256dh,
      p_auth: j.keys.auth,
      p_ua: navigator.userAgent.slice(0, 200),
    });
    return { ok: !error, error };
  } catch (e) { return { ok: false, error: e }; }
}

async function initPushButton() {
  const btn = document.getElementById('notify-btn');
  if (!btn || !pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (sub && !sameKey(sub)) { await sub.unsubscribe(); sub = null; }  // cambió la llave → re-suscribir
    if (Notification.permission === 'granted' && sub) {
      await saveSubscription(sub);   // recupera: re-guarda por si un intento previo no llegó
      btn.style.display = 'none';
      return;
    }
  } catch (e) {}
  if (Notification.permission === 'denied') { btn.style.display = 'none'; return; }
  btn.style.display = 'flex';
  btn.onclick = subscribePush;
}

async function subscribePush() {
  if (!pushSupported()) { _pushToast('Tu navegador no soporta notificaciones'); return; }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { _pushToast('Notificaciones no activadas'); return; }

    const reg = await navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready);
    let sub = await reg.pushManager.getSubscription();
    if (sub && !sameKey(sub)) { await sub.unsubscribe(); sub = null; }
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(VAPID_PUBLIC) });
    }
    const res = await saveSubscription(sub);
    if (!res.ok) { _pushToast('No se pudo registrar: ' + ((res.error && res.error.message) || 'error')); return; }
    const btn = document.getElementById('notify-btn');
    if (btn) btn.style.display = 'none';
    _pushToast('🔔 Avisos activados. Te avisaremos de los partidos.');
  } catch (e) {
    _pushToast('No se pudo activar: ' + (e.message || e));
  }
}

function _pushToast(msg) {
  const t = document.getElementById('toast');
  if (!t) { alert(msg); return; }
  t.textContent = msg; t.style.borderColor = 'var(--blue)';
  t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3500);
}

document.addEventListener('DOMContentLoaded', () => setTimeout(initPushButton, 1500));
