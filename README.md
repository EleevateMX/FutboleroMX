# ⚽ FutboleroMX

**La cancha de todos.** Sitio de fútbol en vivo con 12 emisoras gratuitas, quiniela con login, rankings y páginas legales completas. Proyecto 100% estático — HTML, CSS y JS puro, sin frameworks ni dependencias.

## Vista previa

> Fondo oscuro · Rojo/Dorado · Tema fútbol mexicano

## Características

- 📡 **12 emisoras en vivo** — Claro Sports, TyC Sports, DirecTV Sports, Win Sports, Gol TV, Telemundo, BBC Sport, FOX Sports, DSports+, TSN, FIFA+ y Olympic Channel
- ▶️ **Player embebido** con selector de canal por partido
- 🔐 **Sistema de login/registro** completo (localStorage, sin backend)
- 🏆 **Quiniela interactiva** — predice resultados, guarda picks, suma puntos
- 📊 **Ranking semanal** de usuarios
- 🔮 **El Oráculo** — predicción automática con precisión semanal
- 📅 **Partidos en vivo y próximos** con minutero automático
- 📜 **Páginas legales completas** — Términos, Privacidad, Cookies y DMCA
- 📱 **Responsive** — funciona en móvil y escritorio

## Estructura

```
FutboleroMX/
├── index.html              # Página principal
├── css/
│   └── style.css           # Tema oscuro completo
├── js/
│   ├── data.js             # Canales, partidos, ranking, trivia
│   ├── auth.js             # Sistema de autenticación
│   └── app.js              # Lógica principal de la app
└── pages/
    ├── terminos.html       # Términos y Condiciones
    ├── privacidad.html     # Política de Privacidad
    ├── cookies.html        # Política de Cookies
    └── dmca.html           # DMCA y Contenido de Terceros
```

## Uso local

```bash
git clone https://github.com/tu-usuario/FutboleroMX
cd FutboleroMX
# Opción 1: abre index.html directo en el navegador
# Opción 2: servidor local
npx serve .
# Opción 3:
python -m http.server 8000
```

## Agregar un canal

En `js/data.js`, agrega un objeto al array `CHANNELS`:

```js
{
  id: "mi-canal",
  name: "Mi Canal",
  sub: "México · Gratis",
  icon: "📺",
  youtubeId: "UC_ID_DEL_CANAL_AQUI",
  free: true,
  desc: "Descripción del canal",
}
```

## Agregar un partido

En `js/data.js`, agrega al array `MATCHES`:

```js
{
  id: 9,
  home: { name: "México", flag: "🇲🇽", score: null },
  away: { name: "Argentina", flag: "🇦🇷", score: null },
  status: "upcoming",   // "live" | "upcoming" | "finished"
  time: "21:00",
  competition: "Copa del Mundo 2026 · Grupo A",
  venue: "Estadio Azteca, México D.F.",
  channels: ["claro-sports", "telemundo"],
}
```

## Deploy en GitHub Pages

1. Sube el proyecto a GitHub
2. Ve a **Settings → Pages**
3. Source: `Deploy from a branch` → `main` → `/ (root)`
4. Tu sitio estará en `https://tu-usuario.github.io/FutboleroMX`

## Tecnologías

- HTML5 semántico
- CSS3 con variables custom (tema oscuro)
- JavaScript vanilla (ES6+)
- Google Fonts — Inter
- YouTube Embed API para los streams

## Legal

FutboleroMX es un proyecto independiente de entretenimiento. No aloja ni transmite directamente señales de terceros. No tiene afiliación con FIFA, UEFA, CONCACAF ni ningún organismo oficial de fútbol. Ver [DMCA](pages/dmca.html) para más información.

## Licencia

MIT — libre de usar, modificar y distribuir con atribución.
