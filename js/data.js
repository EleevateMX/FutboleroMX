const CHANNELS = [
  { id:"claro-sports",    name:"Claro Sports",      sub:"LATAM · Gratis",       icon:"📺", youtubeId:"UCVzcjDl57FP_OyROGbUFkUw", free:true,  desc:"Canal deportivo gratuito LATAM" },
  { id:"tyc-sports",      name:"TyC Sports",         sub:"Argentina",            icon:"📺", youtubeId:"UCNkKYauoqAo4TdDCFWfK5bg", free:true,  desc:"Fútbol argentino y mundial" },
  { id:"directv-sports",  name:"DirecTV Sports",     sub:"LATAM",                icon:"📺", youtubeId:"UCgjQJPfC7eDxiAb1W49GSMA", free:true,  desc:"Deportes premium LATAM" },
  { id:"win-sports",      name:"Win Sports",         sub:"Colombia",             icon:"📺", youtubeId:"UCRlKUCHFbFaJ0HG0GsL2RHg", free:true,  desc:"Fútbol colombiano" },
  { id:"gol-tv",          name:"Gol Televisión",     sub:"España",               icon:"📺", youtubeId:"UCmcq-RZQoTbNXCBMJk-MLDg", free:true,  desc:"Canal de fútbol España" },
  { id:"telemundo",       name:"Telemundo",          sub:"USA · Español",        icon:"📺", youtubeId:"UC-SRYpj00xV-gLqiPYxiqYQ", free:true,  desc:"Deportes en español USA" },
  { id:"bbc-sport",       name:"BBC Sport",          sub:"Reino Unido",          icon:"📺", youtubeId:"UCnJ_usHBHMDxXYWgBFRoUDg", free:true,  desc:"British sports coverage" },
  { id:"fox-sports",      name:"FOX Sports",         sub:"USA",                  icon:"📺", youtubeId:"UCzNKIkY5W2JLXHGph-laSHg", free:true,  desc:"FOX Sports highlights & live" },
  { id:"dsports",         name:"DSports+",           sub:"LATAM",                icon:"📺", youtubeId:"UCMtFiMKRgBJARwLCEhcV17g", free:true,  desc:"DSports / DeporTV LATAM" },
  { id:"tsn",             name:"TSN",                sub:"Canadá",               icon:"📺", youtubeId:"UCTuoiXKEMYNSiWEERu7UaFg", free:true,  desc:"The Sports Network Canada" },
  { id:"fifa-plus",       name:"FIFA+",              sub:"Internacional",        icon:"📺", youtubeId:"UCpcTrCXblq78GZrTUTLWeBw", free:true,  desc:"Canal oficial FIFA" },
  { id:"olympic-channel", name:"Olympic Channel",    sub:"Internacional",        icon:"📺", youtubeId:"UCTl3QQTvqHFjurroKxexy2Q", free:true,  desc:"Cobertura olímpica oficial" },
];

function getStreamUrl(ch) {
  return `https://www.youtube.com/embed/live_stream?channel=${ch.youtubeId}&autoplay=1&mute=0`;
}

const MATCHES = [
  {
    id:1,
    home:{ name:"México",    flag:"🇲🇽", score:2 },
    away:{ name:"Brasil",    flag:"🇧🇷", score:1 },
    status:"live", minute:74,
    competition:"Copa del Mundo 2026",
    venue:"Estadio Azteca, México D.F.",
    channels:["claro-sports","telemundo","fox-sports"],
  },
  {
    id:2,
    home:{ name:"Italia",    flag:"🇮🇹", score:1 },
    away:{ name:"Bélgica",   flag:"🇧🇪", score:0 },
    status:"live", minute:55,
    competition:"UEFA Nations League",
    venue:"San Siro, Milán",
    channels:["bbc-sport","tsn","directv-sports"],
  },
  {
    id:3,
    home:{ name:"Japón",     flag:"🇯🇵", score:0 },
    away:{ name:"Corea del Sur", flag:"🇰🇷", score:0 },
    status:"live", minute:34,
    competition:"AFC Friendly",
    venue:"National Stadium, Tokio",
    channels:["olympic-channel","fifa-plus"],
  },
  {
    id:4,
    home:{ name:"Argentina", flag:"🇦🇷", score:null },
    away:{ name:"Francia",   flag:"🇫🇷", score:null },
    status:"upcoming", time:"20:00",
    competition:"Copa del Mundo 2026 · Grupo C",
    venue:"MetLife Stadium, New York",
    channels:["telemundo","fox-sports","tyc-sports","dsports"],
  },
  {
    id:5,
    home:{ name:"España",    flag:"🇪🇸", score:null },
    away:{ name:"Alemania",  flag:"🇩🇪", score:null },
    status:"upcoming", time:"22:00",
    competition:"Copa del Mundo 2026 · Grupo B",
    venue:"Rose Bowl, Los Ángeles",
    channels:["bbc-sport","fox-sports","gol-tv","tsn"],
  },
  {
    id:6,
    home:{ name:"Portugal",  flag:"🇵🇹", score:null },
    away:{ name:"Inglaterra",flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", score:null },
    status:"upcoming", time:"00:00",
    competition:"Copa del Mundo 2026 · Grupo D",
    venue:"AT&T Stadium, Dallas",
    channels:["bbc-sport","tsn","fox-sports"],
  },
  {
    id:7,
    home:{ name:"Colombia",  flag:"🇨🇴", score:null },
    away:{ name:"Uruguay",   flag:"🇺🇾", score:null },
    status:"upcoming", time:"02:00",
    competition:"Copa del Mundo 2026 · Grupo A",
    venue:"SoFi Stadium, Los Ángeles",
    channels:["win-sports","directv-sports","claro-sports","tyc-sports"],
  },
  {
    id:8,
    home:{ name:"Marruecos", flag:"🇲🇦", score:null },
    away:{ name:"Senegal",   flag:"🇸🇳", score:null },
    status:"upcoming", time:"04:00",
    competition:"Copa del Mundo 2026 · Grupo E",
    venue:"Levi's Stadium, San Francisco",
    channels:["bbc-sport","fifa-plus"],
  },
];

const RESULTS = [
  { home:{name:"América",   flag:"🦅", score:3}, away:{name:"Chivas",  flag:"⚽",score:1}, competition:"Liga MX · Jornada 17",   winner:"home" },
  { home:{name:"Barcelona", flag:"🔵",score:0}, away:{name:"R. Madrid",flag:"⚪",score:2}, competition:"LaLiga · Jornada 38",     winner:"away" },
  { home:{name:"Arsenal",   flag:"🔴",score:2}, away:{name:"Liverpool",flag:"🔴",score:2}, competition:"Premier League · GW38",   winner:"draw" },
  { home:{name:"Inter",     flag:"⚫",score:1}, away:{name:"PSG",      flag:"🔵",score:0}, competition:"Champions League · Final",winner:"home" },
];

const RANKING = [
  { pos:1, name:"CristianR",   pts:33, avatar:"CR", color:"#f59e0b", medal:"🏆" },
  { pos:2, name:"MarcoG",      pts:29, avatar:"MG", color:"#9ca3af", medal:"🥈" },
  { pos:3, name:"LuisA",       pts:27, avatar:"LA", color:"#cd7f32", medal:"🥉" },
  { pos:4, name:"KarenP",      pts:24, avatar:"KP", color:"#60a5fa" },
  { pos:5, name:"DiegoR",      pts:21, avatar:"DR", color:"#c084fc" },
  { pos:6, name:"SofiaV",      pts:19, avatar:"SV", color:"#f87171" },
  { pos:7, name:"JuanC",       pts:17, avatar:"JC", color:"#34d399" },
  { pos:8, name:"AnaM",        pts:15, avatar:"AM", color:"#fb923c" },
];

const TRIVIA = [
  "<strong>Brasil</strong> es la única selección en haber participado en <strong>todos</strong> los mundiales. Ha ganado <strong>5 títulos</strong>: 1958, 1962, 1970, 1994 y 2002.",
  "El estadio <strong>Azteca</strong> en México D.F. es el único que ha albergado <strong>dos finales</strong> de Copa del Mundo: 1970 y 1986.",
  "<strong>Pelé</strong> sigue siendo el único jugador en haber ganado <strong>tres Copas del Mundo</strong> (1958, 1962 y 1970).",
  "El gol más rápido en la historia de los mundiales lo marcó <strong>Hakan Şükür</strong> de Turquía en solo <strong>11 segundos</strong> en 2002.",
  "La Copa del Mundo <strong>2026</strong> será la primera en realizarse en <strong>tres países</strong>: México, Estados Unidos y Canadá.",
];
