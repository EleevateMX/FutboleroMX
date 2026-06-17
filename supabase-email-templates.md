# Plantillas de correo de Supabase Auth — TVContigo

Cómo aplicarlas:
1. Supabase → **Authentication → Emails → Templates**
2. Para cada plantilla, pega el **Subject** y el **Message (HTML)** de abajo.
3. Save.

Variables de Supabase: `{{ .ConfirmationURL }}` (botón de acción), `{{ .SiteURL }}`, `{{ .Email }}`.

---

## 1) Confirm signup (Confirmar registro)

**Subject:** Confirma tu cuenta en TVContigo ⚽

**Message (HTML):**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#07070f;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center">
  <table width="480" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border:1px solid #1d1d30;border-radius:16px;overflow:hidden;">
    <tr><td style="background:#0d1f3d;padding:24px;text-align:center;">
      <span style="font-size:28px;font-weight:bold;color:#ffffff;">TV<span style="color:#f97316;">Contigo</span></span>
    </td></tr>
    <tr><td style="padding:28px;color:#f0f0ff;">
      <h2 style="margin:0 0 12px;font-size:21px;">¡Bienvenido a TVContigo!</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 22px;">
        Gracias por registrarte. Confirma tu correo para activar tu cuenta y empezar a ver el Mundial 2026 en vivo, gratis.
      </p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:8px;font-weight:bold;font-size:15px;">Confirmar mi cuenta</a>
      <p style="color:#4b5563;font-size:12px;margin:24px 0 0;">Si no creaste esta cuenta, ignora este correo.</p>
    </td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid #1d1d30;color:#4b5563;font-size:11px;text-align:center;">
      TVContigo · tvcontigo.site · Juega con responsabilidad (+18)
    </td></tr>
  </table>
</td></tr></table>
```

---

## 2) Reset Password (Olvidé mi contraseña)

**Subject:** Restablece tu contraseña — TVContigo

**Message (HTML):**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#07070f;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center">
  <table width="480" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border:1px solid #1d1d30;border-radius:16px;overflow:hidden;">
    <tr><td style="background:#0d1f3d;padding:24px;text-align:center;">
      <span style="font-size:28px;font-weight:bold;color:#ffffff;">TV<span style="color:#f97316;">Contigo</span></span>
    </td></tr>
    <tr><td style="padding:28px;color:#f0f0ff;">
      <h2 style="margin:0 0 12px;font-size:21px;">Restablece tu contraseña</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 22px;">
        Recibimos una solicitud para cambiar tu contraseña. Haz clic en el botón para crear una nueva. El enlace caduca en 1 hora.
      </p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:8px;font-weight:bold;font-size:15px;">Crear nueva contraseña</a>
      <p style="color:#4b5563;font-size:12px;margin:24px 0 0;">Si no fuiste tú, ignora este correo; tu contraseña sigue igual.</p>
    </td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid #1d1d30;color:#4b5563;font-size:11px;text-align:center;">
      TVContigo · tvcontigo.site
    </td></tr>
  </table>
</td></tr></table>
```

---

## 3) Magic Link (Entrar sin contraseña)

**Subject:** Tu enlace para entrar a TVContigo

**Message (HTML):**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#07070f;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center">
  <table width="480" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border:1px solid #1d1d30;border-radius:16px;overflow:hidden;">
    <tr><td style="background:#0d1f3d;padding:24px;text-align:center;">
      <span style="font-size:28px;font-weight:bold;color:#ffffff;">TV<span style="color:#f97316;">Contigo</span></span>
    </td></tr>
    <tr><td style="padding:28px;color:#f0f0ff;">
      <h2 style="margin:0 0 12px;font-size:21px;">Entra a tu cuenta</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 22px;">Haz clic para iniciar sesión. El enlace caduca pronto.</p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:8px;font-weight:bold;font-size:15px;">Entrar a TVContigo</a>
    </td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid #1d1d30;color:#4b5563;font-size:11px;text-align:center;">TVContigo · tvcontigo.site</td></tr>
  </table>
</td></tr></table>
```

---

## 4) Change Email Address (Cambio de correo)

**Subject:** Confirma tu nuevo correo — TVContigo

**Message (HTML):** (igual que #1 pero con este texto)
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#07070f;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center">
  <table width="480" cellpadding="0" cellspacing="0" style="background:#0f0f1a;border:1px solid #1d1d30;border-radius:16px;overflow:hidden;">
    <tr><td style="background:#0d1f3d;padding:24px;text-align:center;">
      <span style="font-size:28px;font-weight:bold;color:#ffffff;">TV<span style="color:#f97316;">Contigo</span></span>
    </td></tr>
    <tr><td style="padding:28px;color:#f0f0ff;">
      <h2 style="margin:0 0 12px;font-size:21px;">Confirma tu nuevo correo</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 22px;">Da clic para confirmar el cambio de correo en tu cuenta de TVContigo.</p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:8px;font-weight:bold;font-size:15px;">Confirmar nuevo correo</a>
    </td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid #1d1d30;color:#4b5563;font-size:11px;text-align:center;">TVContigo · tvcontigo.site</td></tr>
  </table>
</td></tr></table>
```
