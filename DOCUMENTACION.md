# TVContigo — Documentación maestra del proyecto

> Sitio de fútbol en vivo gratis (Mundial 2026) + quiniela con premios + comunidad.
> Última actualización: junio 2026.

---

## 1. Resumen

- **Producto:** plataforma estilo Roku/Google TV para ver fútbol en vivo gratis (canales vía embed.st), con quiniela de dinero, juego amistoso gratis, ranking, muro de afición, notificaciones push y PWA instalable.
- **Dominio:** **tvcontigo.site** (HTTPS) — Hostinger DNS → GitHub Pages.
- **Repo:** GitHub `EleevateMX/FutboleroMX` (carpeta local `C:\Users\Edy Medina\Claude\FutboleroMX`). Branch `main`. Deploy automático a GitHub Pages al hacer push.
- **Backend:** Supabase (proyecto **FutboleroMX**, ref `sclqzavebwinezpivmwr`, plan **Pro**).
- **Stack:** HTML/CSS/JS puro (sin framework, sin build). Supabase JS por CDN. Edge Functions en Deno. pg_cron + pg_net para automatización.

---

## 2. Claves y accesos (PRIVADO)

| Qué | Valor |
|-----|-------|
| Admin (URL) | `tvcontigo.site/admin/` |
| Clave de operación (única, desbloquea todo el admin) | `TVC-Quiniela-2026` |
| Supabase project ref | `sclqzavebwinezpivmwr` |
| Custom auth domain | `auth.tvcontigo.site` |
| Cron key (Edge Functions internas) | `tvc-cron-2026` |
| Mail key (Edge Function send-email) | `tvc-mail-2026` |
| Email del dueño | edykiira@gmail.com |

- La **clave de operación** está SOLO en el servidor (función `_qadmin_ok`), nunca en el código del sitio. El admin la valida con el RPC `check_op_key` y la guarda en sessionStorage durante la sesión.
- VAPID (push): par de llaves en formato JWK, hardcodeado en el Edge Function `send-push` y la pública en `js/push.js`.
- `RESEND_API_KEY`: secret en Supabase (Edge Functions → Secrets) — lo puso el dueño.

---

## 3. Infraestructura de dominio

- **Hostinger DNS** de tvcontigo.site:
  - 4 registros `A` `@` → GitHub Pages: `185.199.108.153`, `.109`, `.110`, `.111`
  - `CNAME` `auth` → `sclqzavebwinezpivmwr.supabase.co` (custom auth domain)
  - `CNAME` `www` → tvcontigo.site
  - TXT `_acme-challenge.auth` (verificación SSL del custom domain Supabase)
- Archivo `CNAME` en el repo = `tvcontigo.site` (GitHub Pages custom domain).
- **Custom Auth Domain** (Supabase Pro add-on $10/mes): hace que el login con Google muestre `auth.tvcontigo.site` en vez de `supabase.co`. `SUPA_URL` en `js/auth.js` y `admin/index.html` = `https://auth.tvcontigo.site`.

---

## 4. Estructura del repo

```
index.html              # Home: hero en vivo, canales, partidos, quiniela CTA, juego amistoso, ranking, muro, comunidad, footer
quiniela.html           # Quiniela de dinero (multi-pool)
perfil.html             # Perfil: avatar, nombre, referido, boletos, bounty
admin/index.html        # Panel admin (pestañas)
js/data.js              # MATCHES (calendario real Mundial 2026), CHANNELS default, helpers
js/auth.js              # Supabase client (sb), Auth (login/registro/Google), trackEvent, updateNav
js/app.js               # Lógica del home (hero, canales, ranking, muro, ads, referidos, comunidad)
js/quiniela.js          # Lógica quiniela (pools, pagos, bounty, editar pick)
js/perfil.js            # Lógica perfil
js/push.js              # Suscripción a notificaciones push
css/style.css           # Diseño (azul #0ea5e9, naranja #f97316, fondo #07070f)
sw.js                   # Service worker (cache + push). Subir CACHE 'tvc-vN' al cambiar JS
manifest.json           # PWA
robots.txt, sitemap.xml # SEO
og-image.png            # Vista previa al compartir (WhatsApp/Facebook)
icons/                  # Iconos PWA (PNG 72-512) + icon.svg + generate-icons.html
pages/                  # privacidad, terminos, dmca, reglamento-quiniela
assets/social/          # Piezas de redes (logo, posts de partidos, story quiniela) + PHILOSOPHY.md
supabase-email-templates.md  # Plantillas de correo de Supabase Auth (pegar en dashboard)
```

---

## 5. Base de datos (Supabase, schema public)

| Tabla | Para qué | RLS |
|-------|----------|-----|
| `profiles` | Usuarios (name, pts, picks, avatar_url, referral_code, referred_by) | Solo el dueño lee/edita su fila |
| `live_config` (1 fila) | Partido en vivo actual (slug, equipos, marcador, canales JSON, status, pushed_slug) | Lectura pública; escritura solo por RPC admin |
| `quiniela_pool` (3 filas) | Quinielas $100/$150/$200 (entry, fee, base_pot, seed_picks, status, result_champion) | Lectura pública; escritura por RPC |
| `quiniela_entries` | Boletos (user_id, pool_id, champion_pick, email, payment_ref, payment_status) | Dueño lee su fila; admin lee por RPC |
| `pay_config` (1 fila) | Datos bancarios Revolut (nacional CLABE + internacional SWIFT + link referido) | Lectura solo autenticados |
| `ad_config` (1 fila) | Anuncios (enabled, desktop/mobile code + imagen + link) | Lectura pública |
| `site_settings` (1 fila) | GA4 id, Meta Pixel id, WhatsApp/Telegram url | Lectura pública |
| `push_subscriptions` | Dispositivos suscritos (endpoint, p256dh, auth) | Sin SELECT público; guardado por RPC |
| `traffic` | Analítica (kind, label, visitor) | Insert público; sin select (agregados por RPC) |
| `fan_messages` | Muro de afición (con filtro anti-insultos) | Lectura aprobados; post por RPC |
| `app_stats` (1 fila) | installs (instalaciones PWA) | Lectura pública |
| `reminded_matches` | Dedupe de recordatorios | — |

**Vista:** ninguna pública con datos sensibles (la antigua `quiniela_public` se eliminó; se usa RPC `quiniela_stats`).

---

## 6. RPCs principales (funciones SQL)

- `check_op_key(pass)` → bool. Valida la clave (login admin).
- `_qadmin_ok(pass)` → bool interno (la clave vive aquí, server-side).
- `qadmin_verify(entry, pass)` / `qadmin_reject` → verifica/rechaza pago (verify manda correo).
- `qadmin_update_pool(pass, pool_id, ...)` / `qadmin_settle(pool_id, champion, pass)` → config/liquidar quiniela.
- `qadmin_update_pay(...)`, `qadmin_update_ads(...)`, `qadmin_update_live(...)`, `qadmin_update_settings(...)`, `qadmin_delete_message(...)`, `qadmin_entries(pass)`.
- `quiniela_stats()` → conteos por pool/equipo (sin exponer filas).
- `save_push_subscription(endpoint, p256dh, auth, ua)` → guarda suscripción (SECURITY DEFINER, evita RLS).
- `apply_referral(code)` → +10 pts al referidor. `top_ranking()` → ranking real. `user_count()` → usuarios.
- `post_fan_message(msg)` → muro con filtro. `update_my_pick(pool, champ, tiebreak)` → cambiar elección.
- `traffic_summary()` → métricas de tráfico. `push_count()`, `increment_install()`.

---

## 7. Edge Functions (Deno)

| Función | Qué hace | Disparada por |
|---------|----------|---------------|
| `auto-live` | Lee la fuente en-vivo externa; pone partido + canales en vivo (o apaga). Push si es nuevo. | cron `auto-live-1min` |
| `sync-score` | Actualiza el marcador del partido en vivo (match por nombre). | cron `sync-score-every-min` |
| `match-reminder` | Avisa ~15 min antes de cada partido (dedupe). | cron `match-reminder-5min` |
| `send-push` | Envía notificación a todos (usa `jsr:@negrel/webpush`, NO npm:web-push). | admin / auto-live / cron |
| `send-email` | Correo transaccional vía Resend (registro + pago confirmado). | trigger + qadmin_verify |
| `upload-ad` | Sube imagen de anuncio al bucket `ads` (service role). | admin |
| `today-matches` | Devuelve partidos del día (ventana -3h/+30h, nombres español). | admin (Push) |

**Crons activos (pg_cron):** `auto-live-1min`, `sync-score-every-min`, `match-reminder-5min`. Llaman a las funciones vía `net.http_post` con header `x-cron-key`.

---

## 8. Sistemas clave (cómo funcionan)

### Partido en vivo (100% automático)
`auto-live` lee la fuente en-vivo externa cada minuto. Si hay slug `admin/ppv-...`:
extrae canales reales (del array `streams`: embed_name + número), deriva los equipos **del slug** (`ppv-home-vs-away`), escribe `live_config` (status=live, canales, equipos en español) y manda push si el slug es nuevo. Si NO hay slug → `status='off'`.
El front (`app.js loadLiveConfig`): si status≠live → sin partido, oculta canales y muestra próximos. Las banderas se resuelven con `flagFor(name)` desde MATCHES.

### Marcador en vivo
`sync-score` cada minuto cruza `live_config` con el calendario de la fuente (mapa inglés→español) y actualiza `hs/as_`. El front hace polling de live_config cada 25s y actualiza `#hero-score` sin recargar el iframe.

### Quiniela (dinero real)
3 pools ($100/$150/$200), bote base 1000 + seed_picks (Noruega/España/México). Pago por transferencia Revolut (nacional CLABE `646990404004602396` / internacional cuenta `170002404004602394` SWIFT `REVOMXM2`) + link referido Revolut. El usuario pega su folio → queda pendiente → el admin verifica (manda correo). Puede cambiar su elección hasta que la pool siga `open`. Estructura como **concurso de pronósticos por habilidad** (mejor posición legal).

### Notificaciones push
VAPID en JWK. `send-push` usa `jsr:@negrel/webpush` (npm:web-push NO funciona en Deno). Suscripción se guarda por RPC `save_push_subscription` (NO por insert anónimo — daba 401). `js/push.js` detecta cambio de llave (`sameKey`) y re-suscribe. iPhone: solo funciona con la PWA instalada (iOS 16.4+).

### Correos
Supabase Auth manda confirmación de cuenta / reset (plantillas personalizadas en `supabase-email-templates.md`, pegar en dashboard). Quiniela: trigger en insert manda "registrado", `qadmin_verify` manda "pago confirmado" — vía `send-email` (Resend, from `noreply@tvcontigo.site`).

### Anuncios
Propios por imagen (subes PC + móvil + link) o código AdSense. El sitio elige PC/móvil según pantalla. Banner inferior con "Solo salta un anuncio y disfruta".

### Analítica / Referidos / Comunidad
Tráfico real (visitas, únicos, canales, quiniela) en pestaña Tráfico del admin. Referidos: link único por usuario (+10 pts), ranking real. WhatsApp/Telegram: links en admin → botones en el sitio.

### PWA / Compartir / SEO
PWA instalable (iconos reales). Botón compartir (Web Share API) en pila `#fab-stack`. Instalaciones se cuentan por `display-mode: standalone`. SEO: sitemap.xml, robots.txt, JSON-LD, og-image para WhatsApp/Facebook.

---

## 9. Operación diaria (qué hace el dueño)

- **Nada para el partido en vivo / marcador / recordatorios** → 100% automático.
- **Verificar pagos de quiniela:** admin → Quiniela → botón ✓ Verificar (manda correo al jugador).
- **Liquidar quiniela:** al terminar el Mundial, poner el campeón → calcula ganadores.
- **Enviar push manual:** admin → Push → escribir o usar "Partidos del día" → 📢 Avisar.
- **Anuncios:** admin → Anuncios → subir imagen + link.
- **Redes:** publicar las piezas de `assets/social/` con su copy.

Para entrar al admin: `tvcontigo.site/admin/` → clave de operación `TVC-Quiniela-2026` (desbloquea todo).

---

## 10. Gotchas aprendidos (IMPORTANTE)

1. **supabase-js solo manda la petición con `await` o `.then()`.** Una llamada "dispara y olvida" (`sb.from().insert()` sin `.then`) NUNCA se ejecuta. Rompió analítica e instalaciones (se arregló con `.then(()=>{}, ()=>{})`).
2. **npm:web-push NO funciona en Edge Functions de Deno** (módulos nativos de Node). Usar `jsr:@negrel/webpush`.
3. **No depender de RLS para escrituras anónimas** (da 401 si falta el GRANT de tabla). Mejor RPC SECURITY DEFINER.
4. **VAPID:** las dos llaves deben ser del mismo par. Si cambia la llave, el cliente debe re-suscribir (`sameKey`).
5. **PowerShell GDI+:** tipar estrictamente los params de funciones ([System.Drawing.Font], [single]) o falla el overload de DrawString. Usar fuente **Impact** (estilo Bebas) + Segoe UI Black.
6. **Sandbox de PowerShell:** da falso positivo "Remove-Item on system path '/2'" con patrones como `$x/2` o `-replace '\\"'`. Usar `dangerouslyDisableSandbox` para generación local de imágenes/scrape.
7. **Service worker cachea el JS.** Subir `CACHE = 'tvc-vN'` en sw.js cada vez que cambie un JS, para que el dispositivo baje lo nuevo.
8. **iOS push:** requiere PWA instalada en pantalla de inicio y abrir desde el ícono (no Safari).
9. **Equipos del partido en vivo:** derivar del SLUG, no del JSON de la fuente (el JSON da el equipo equivocado por la estructura de la lista).

---

## 11. Pendientes / mejoras futuras

- **Revisión legal** de la quiniela con dinero (Ley Federal de Juegos y Sorteos / SEGOB) — lo único serio antes de escalar.
- Pegar las **plantillas de correo** de Supabase Auth (archivo `supabase-email-templates.md`).
- Activar **leaked password protection** en Supabase Auth (1 toggle).
- Llenar **GA4 / Meta Pixel / WhatsApp / Telegram** en admin cuando se tengan.
- Las páginas `quiniela.html`/`perfil.html` también podrían registrar tráfico con `.then()` (ya lo hacen vía trackEvent en quiniela).
- El "calendario" estático en `js/data.js` (MATCHES) se podría volver dinámico desde la fuente externa para que los "próximos" siempre estén exactos (hoy se filtran por fecha futura).

---

## 12. Identidad de marca

- Colores: fondo `#07070f`, azul `#0ea5e9` (primario), naranja `#f97316` (acento/CTA), verde `#22c55e`, texto `#f0f0ff`.
- Tipografía: Bebas Neue / Impact (titulares condensados) + Inter / Segoe UI (texto).
- Logo: "TV" blanco + "Contigo" naranja, ícono TV con play azul.
- Eslogan: "El Mundial, contigo" / "Fútbol en vivo, gratis".
- Filosofía de diseño: *Estadio Nocturno* (ver `assets/social/PHILOSOPHY.md`).
