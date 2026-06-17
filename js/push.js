// ── TVContigo — Notificaciones Push ───────────────────────────────────────
const VAPID_PUBLIC = 'BKKsYVRpYFTuHSDxqTyjFOqJq5kY80Vj_ES3Hl_N6Momnx4xtiv-rOhLJ9eYUiZaciKQ-HOxToTuLzPIFE7XgL0';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// Guarda (o re-guarda) la suscripción en Supabase. Devuelve {ok, error}.
async function saveSubscription(sub) {
  try {
    const j = sub.toJSON();
    const user = (typeof Auth !== 'undefined' && Auth.isLoggedIn()) ? Auth.getUser() : null;
    const { error } = await sb.from('push_subscriptions').upsert({
      endpoint: j.endpoint,
      p256dh: j.keys.p256dh,
      auth: j.keys.auth,
      user_id: user ? user.id : null,
      ua: navigator.userAgent.slice(0, 200),
    }, { onConflict: 'endpoint' });
    return { ok: !error, error };
  } catch (e) { return { ok: false, error: e }; }
}

async function initPushButton() {
  const btn = document.getElementById('notify-btn');
  if (!btn || !pushSupported()) return;
  if (Notification.permission === 'granted') {
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      // Recupera: re-guarda por si un intento anterior no llegó a la base
      await saveSubscription(sub);
      btn.style.display = 'none';
      return;
    }
  }
  if (Notification.permission === 'denied') { btn.style.display = 'none'; return; }
  btn.style.display = 'flex';
  btn.onclick = subscribePush;
}

async function subscribePush() {
  if (!pushSupported()) { _pushToast('Tu navegador no soporta notificaciones'); return; }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { _pushToast('Notificaciones no activadas'); return; }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }
    const res = await saveSubscription(sub);
    if (!res.ok) {
      _pushToast('No se pudo registrar: ' + ((res.error && res.error.message) || 'error de guardado'));
      return;
    }
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
