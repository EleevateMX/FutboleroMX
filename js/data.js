// ── TVContigo — Data Layer (datos reales lacancha.tv · Mundial 2026) ───────
// Última sincronización: 2026-06-16

// Slug del partido EN VIVO en embed.st — actualizar cuando cambie el partido
const LIVE_SLUG = 'ppv-austria-vs-jordan';
const ES = (n) => `https://embed.st/embed/admin/${LIVE_SLUG}/${n}`;

// Canales reales actuales (mapeo de números de canal embed.st)
const CHANNELS = [
  { id: 'telemundo-1', name: 'TELEMUNDO', option: 'OPCIÓN 1', tag: 'PARTIDO', url: ES(7),  live: true },
  { id: 'telemundo-2', name: 'TELEMUNDO', option: 'OPCIÓN 2', tag: 'PARTIDO', url: ES(8),  live: true },
  { id: 'tsn-1',       name: 'TSN',       option: 'OPCIÓN 1', tag: '',        url: ES(1),  live: true },
  { id: 'tsn-2',       name: 'TSN',       option: 'OPCIÓN 2', tag: '',        url: ES(2),  live: true },
  { id: 'fs1-1',       name: 'FS1',       option: 'OPCIÓN 1', tag: '',        url: ES(3),  live: true },
  { id: 'fs1-2',       name: 'FS1',       option: 'OPCIÓN 2', tag: '',        url: ES(4),  live: true },
  { id: 'bbc-1',       name: 'BBC ONE',   option: 'OPCIÓN 1', tag: '',        url: ES(5),  live: true },
  { id: 'bbc-2',       name: 'BBC ONE',   option: 'OPCIÓN 2', tag: '',        url: ES(6),  live: true },
  { id: 'zdf-1',       name: 'ZDF',       option: 'OPCIÓN 1', tag: '',        url: ES(9),  live: true },
  { id: 'zdf-2',       name: 'ZDF',       option: 'OPCIÓN 2', tag: '',        url: ES(10), live: true },
  { id: 'orf-1',       name: 'ORF 1',     option: 'OPCIÓN 1', tag: '',        url: ES(11), live: true },
  { id: 'orf-2',       name: 'ORF 1',     option: 'OPCIÓN 2', tag: '',        url: ES(12), live: true },
];

// Todos los partidos del Mundial 2026 (datos reales lacancha.tv)
// status: 'live' | 'finished' | 'scheduled'  ·  kickoff en UTC ISO
const MATCHES = [
  { id:'m1',  home:{name:'México',flag:'🇲🇽'}, away:{name:'Sudáfrica',flag:'🇿🇦'}, kickoff:'2026-06-11T19:00:00+00:00', status:'finished', hs:2, as:0, venue:'Estadio Azteca', city:'Ciudad de México', comp:'Jornada 1' },
  { id:'m2',  home:{name:'Corea del Sur',flag:'🇰🇷'}, away:{name:'Chequia',flag:'🇨🇿'}, kickoff:'2026-06-12T02:00:00+00:00', status:'finished', hs:2, as:1, venue:'', city:'', comp:'Jornada 1' },
  { id:'m3',  home:{name:'EE.UU.',flag:'🇺🇸'}, away:{name:'Paraguay',flag:'🇵🇾'}, kickoff:'2026-06-13T01:00:00+00:00', status:'finished', hs:4, as:1, venue:'', city:'', comp:'Jornada 1' },
  { id:'m4',  home:{name:'Catar',flag:'🇶🇦'}, away:{name:'Suiza',flag:'🇨🇭'}, kickoff:'2026-06-13T19:00:00+00:00', status:'finished', hs:1, as:1, venue:'', city:'', comp:'Jornada 1' },
  { id:'m5',  home:{name:'Brasil',flag:'🇧🇷'}, away:{name:'Marruecos',flag:'🇲🇦'}, kickoff:'2026-06-13T22:00:00+00:00', status:'finished', hs:1, as:1, venue:'', city:'', comp:'Jornada 1' },
  { id:'m6',  home:{name:'Haití',flag:'🇭🇹'}, away:{name:'Escocia',flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'}, kickoff:'2026-06-14T01:00:00+00:00', status:'finished', hs:0, as:1, venue:'', city:'', comp:'Jornada 1' },
  { id:'m7',  home:{name:'Australia',flag:'🇦🇺'}, away:{name:'Turquía',flag:'🇹🇷'}, kickoff:'2026-06-14T04:00:00+00:00', status:'finished', hs:2, as:0, venue:'', city:'', comp:'Jornada 1' },
  { id:'m8',  home:{name:'Alemania',flag:'🇩🇪'}, away:{name:'Curazao',flag:'🇨🇼'}, kickoff:'2026-06-14T17:00:00+00:00', status:'finished', hs:7, as:1, venue:'', city:'', comp:'Jornada 1' },
  { id:'m9',  home:{name:'Países Bajos',flag:'🇳🇱'}, away:{name:'Japón',flag:'🇯🇵'}, kickoff:'2026-06-14T20:00:00+00:00', status:'finished', hs:2, as:2, venue:'', city:'', comp:'Jornada 1' },
  { id:'m10', home:{name:'Costa de Marfil',flag:'🇨🇮'}, away:{name:'Ecuador',flag:'🇪🇨'}, kickoff:'2026-06-14T23:00:00+00:00', status:'finished', hs:1, as:0, venue:'', city:'', comp:'Jornada 1' },
  { id:'m11', home:{name:'Suecia',flag:'🇸🇪'}, away:{name:'Túnez',flag:'🇹🇳'}, kickoff:'2026-06-15T02:00:00+00:00', status:'finished', hs:5, as:1, venue:'', city:'', comp:'Jornada 1' },
  { id:'m12', home:{name:'España',flag:'🇪🇸'}, away:{name:'Cabo Verde',flag:'🇨🇻'}, kickoff:'2026-06-15T16:00:00+00:00', status:'finished', hs:0, as:0, venue:'', city:'', comp:'Jornada 1' },
  { id:'m13', home:{name:'Bélgica',flag:'🇧🇪'}, away:{name:'Egipto',flag:'🇪🇬'}, kickoff:'2026-06-15T19:00:00+00:00', status:'finished', hs:1, as:1, venue:'', city:'', comp:'Jornada 1' },
  { id:'m14', home:{name:'Arabia Saudita',flag:'🇸🇦'}, away:{name:'Uruguay',flag:'🇺🇾'}, kickoff:'2026-06-15T22:00:00+00:00', status:'finished', hs:1, as:1, venue:'', city:'', comp:'Jornada 1' },
  { id:'m15', home:{name:'Irán',flag:'🇮🇷'}, away:{name:'Nueva Zelanda',flag:'🇳🇿'}, kickoff:'2026-06-16T01:00:00+00:00', status:'finished', hs:2, as:2, venue:'', city:'', comp:'Jornada 1' },
  { id:'m16', home:{name:'Francia',flag:'🇫🇷'}, away:{name:'Senegal',flag:'🇸🇳'}, kickoff:'2026-06-16T19:00:00+00:00', status:'finished', hs:3, as:1, venue:'', city:'', comp:'Jornada 1' },
  { id:'m17', home:{name:'Irak',flag:'🇮🇶'}, away:{name:'Noruega',flag:'🇳🇴'}, kickoff:'2026-06-16T22:00:00+00:00', status:'finished', hs:1, as:4, venue:'', city:'', comp:'Jornada 1' },
  { id:'m18', home:{name:'Argentina',flag:'🇦🇷'}, away:{name:'Argelia',flag:'🇩🇿'}, kickoff:'2026-06-17T01:00:00+00:00', status:'finished', hs:3, as:0, venue:'Arrowhead Stadium', city:'Kansas City', comp:'Jornada 1' },
  { id:'m19', home:{name:'Austria',flag:'🇦🇹'}, away:{name:'Jordania',flag:'🇯🇴'}, kickoff:'2026-06-17T04:00:00+00:00', status:'live', hs:0, as:0, venue:'', city:'', comp:'Jornada 1', defaultChannel:'telemundo-1' },
  { id:'m20', home:{name:'Portugal',flag:'🇵🇹'}, away:{name:'RD Congo',flag:'🇨🇩'}, kickoff:'2026-06-17T17:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 1' },
  { id:'m21', home:{name:'Inglaterra',flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'}, away:{name:'Croacia',flag:'🇭🇷'}, kickoff:'2026-06-17T20:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 1' },
  { id:'m22', home:{name:'Ghana',flag:'🇬🇭'}, away:{name:'Panamá',flag:'🇵🇦'}, kickoff:'2026-06-17T23:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 1' },
  { id:'m23', home:{name:'Uzbekistán',flag:'🇺🇿'}, away:{name:'Colombia',flag:'🇨🇴'}, kickoff:'2026-06-18T02:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 1' },
  { id:'m24', home:{name:'Chequia',flag:'🇨🇿'}, away:{name:'Sudáfrica',flag:'🇿🇦'}, kickoff:'2026-06-18T16:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m25', home:{name:'Canadá',flag:'🇨🇦'}, away:{name:'Catar',flag:'🇶🇦'}, kickoff:'2026-06-18T22:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m26', home:{name:'México',flag:'🇲🇽'}, away:{name:'Corea del Sur',flag:'🇰🇷'}, kickoff:'2026-06-19T01:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'Estadio Akron', city:'Guadalajara', comp:'Jornada 2' },
  { id:'m27', home:{name:'EE.UU.',flag:'🇺🇸'}, away:{name:'Australia',flag:'🇦🇺'}, kickoff:'2026-06-19T19:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m28', home:{name:'Escocia',flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'}, away:{name:'Marruecos',flag:'🇲🇦'}, kickoff:'2026-06-19T22:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m29', home:{name:'Brasil',flag:'🇧🇷'}, away:{name:'Haití',flag:'🇭🇹'}, kickoff:'2026-06-20T00:30:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m30', home:{name:'Turquía',flag:'🇹🇷'}, away:{name:'Paraguay',flag:'🇵🇾'}, kickoff:'2026-06-20T03:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m31', home:{name:'Países Bajos',flag:'🇳🇱'}, away:{name:'Suecia',flag:'🇸🇪'}, kickoff:'2026-06-20T17:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m32', home:{name:'Alemania',flag:'🇩🇪'}, away:{name:'Costa de Marfil',flag:'🇨🇮'}, kickoff:'2026-06-20T20:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m33', home:{name:'Ecuador',flag:'🇪🇨'}, away:{name:'Curazao',flag:'🇨🇼'}, kickoff:'2026-06-21T00:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m34', home:{name:'Túnez',flag:'🇹🇳'}, away:{name:'Japón',flag:'🇯🇵'}, kickoff:'2026-06-21T04:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m35', home:{name:'España',flag:'🇪🇸'}, away:{name:'Arabia Saudita',flag:'🇸🇦'}, kickoff:'2026-06-21T16:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m36', home:{name:'Bélgica',flag:'🇧🇪'}, away:{name:'Irán',flag:'🇮🇷'}, kickoff:'2026-06-21T19:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m37', home:{name:'Uruguay',flag:'🇺🇾'}, away:{name:'Cabo Verde',flag:'🇨🇻'}, kickoff:'2026-06-21T22:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m38', home:{name:'Nueva Zelanda',flag:'🇳🇿'}, away:{name:'Egipto',flag:'🇪🇬'}, kickoff:'2026-06-22T01:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m39', home:{name:'Argentina',flag:'🇦🇷'}, away:{name:'Austria',flag:'🇦🇹'}, kickoff:'2026-06-22T17:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m40', home:{name:'Francia',flag:'🇫🇷'}, away:{name:'Irak',flag:'🇮🇶'}, kickoff:'2026-06-22T21:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m41', home:{name:'Noruega',flag:'🇳🇴'}, away:{name:'Senegal',flag:'🇸🇳'}, kickoff:'2026-06-23T00:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m42', home:{name:'Jordania',flag:'🇯🇴'}, away:{name:'Argelia',flag:'🇩🇿'}, kickoff:'2026-06-23T03:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m43', home:{name:'Portugal',flag:'🇵🇹'}, away:{name:'Uzbekistán',flag:'🇺🇿'}, kickoff:'2026-06-23T17:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m44', home:{name:'Inglaterra',flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'}, away:{name:'Ghana',flag:'🇬🇭'}, kickoff:'2026-06-23T20:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m45', home:{name:'Panamá',flag:'🇵🇦'}, away:{name:'Croacia',flag:'🇭🇷'}, kickoff:'2026-06-23T23:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m46', home:{name:'Colombia',flag:'🇨🇴'}, away:{name:'RD Congo',flag:'🇨🇩'}, kickoff:'2026-06-24T02:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 2' },
  { id:'m47', home:{name:'Suiza',flag:'🇨🇭'}, away:{name:'Canadá',flag:'🇨🇦'}, kickoff:'2026-06-24T19:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m48', home:{name:'Marruecos',flag:'🇲🇦'}, away:{name:'Haití',flag:'🇭🇹'}, kickoff:'2026-06-24T22:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m49', home:{name:'Escocia',flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'}, away:{name:'Brasil',flag:'🇧🇷'}, kickoff:'2026-06-24T22:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m50', home:{name:'Chequia',flag:'🇨🇿'}, away:{name:'México',flag:'🇲🇽'}, kickoff:'2026-06-25T01:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m51', home:{name:'Sudáfrica',flag:'🇿🇦'}, away:{name:'Corea del Sur',flag:'🇰🇷'}, kickoff:'2026-06-25T01:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m52', home:{name:'Ecuador',flag:'🇪🇨'}, away:{name:'Alemania',flag:'🇩🇪'}, kickoff:'2026-06-25T20:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m53', home:{name:'Curazao',flag:'🇨🇼'}, away:{name:'Costa de Marfil',flag:'🇨🇮'}, kickoff:'2026-06-25T20:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m54', home:{name:'Japón',flag:'🇯🇵'}, away:{name:'Suecia',flag:'🇸🇪'}, kickoff:'2026-06-25T23:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m55', home:{name:'Túnez',flag:'🇹🇳'}, away:{name:'Países Bajos',flag:'🇳🇱'}, kickoff:'2026-06-25T23:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m56', home:{name:'Turquía',flag:'🇹🇷'}, away:{name:'EE.UU.',flag:'🇺🇸'}, kickoff:'2026-06-26T02:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m57', home:{name:'Paraguay',flag:'🇵🇾'}, away:{name:'Australia',flag:'🇦🇺'}, kickoff:'2026-06-26T02:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m58', home:{name:'Senegal',flag:'🇸🇳'}, away:{name:'Irak',flag:'🇮🇶'}, kickoff:'2026-06-26T19:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m59', home:{name:'Noruega',flag:'🇳🇴'}, away:{name:'Francia',flag:'🇫🇷'}, kickoff:'2026-06-26T19:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m60', home:{name:'Uruguay',flag:'🇺🇾'}, away:{name:'España',flag:'🇪🇸'}, kickoff:'2026-06-27T00:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m61', home:{name:'Cabo Verde',flag:'🇨🇻'}, away:{name:'Arabia Saudita',flag:'🇸🇦'}, kickoff:'2026-06-27T00:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m62', home:{name:'Egipto',flag:'🇪🇬'}, away:{name:'Irán',flag:'🇮🇷'}, kickoff:'2026-06-27T03:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m63', home:{name:'Nueva Zelanda',flag:'🇳🇿'}, away:{name:'Bélgica',flag:'🇧🇪'}, kickoff:'2026-06-27T03:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m64', home:{name:'Panamá',flag:'🇵🇦'}, away:{name:'Inglaterra',flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'}, kickoff:'2026-06-27T21:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m65', home:{name:'Croacia',flag:'🇭🇷'}, away:{name:'Ghana',flag:'🇬🇭'}, kickoff:'2026-06-27T21:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m66', home:{name:'Colombia',flag:'🇨🇴'}, away:{name:'Portugal',flag:'🇵🇹'}, kickoff:'2026-06-27T23:30:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m67', home:{name:'RD Congo',flag:'🇨🇩'}, away:{name:'Uzbekistán',flag:'🇺🇿'}, kickoff:'2026-06-27T23:30:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m68', home:{name:'Argelia',flag:'🇩🇿'}, away:{name:'Austria',flag:'🇦🇹'}, kickoff:'2026-06-28T02:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
  { id:'m69', home:{name:'Jordania',flag:'🇯🇴'}, away:{name:'Argentina',flag:'🇦🇷'}, kickoff:'2026-06-28T02:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
];

const TRIVIA = [
  { q: '¿Cuántas selecciones juegan el Mundial 2026?', a: '48 selecciones' },
  { q: '¿Cuántos partidos se jugarán en total?', a: '104 partidos' },
  { q: '¿Qué países son sede del Mundial 2026?', a: 'México, EE.UU. y Canadá' },
  { q: '¿En qué estadio se jugará la final?', a: 'MetLife Stadium, Nueva Jersey' },
  { q: '¿Dónde fue el partido inaugural?', a: 'Estadio Azteca, México' },
  { q: '¿Cuántos estadios albergan el Mundial?', a: '16 estadios en 3 países' },
  { q: '¿Qué país ganó el Mundial 2022?', a: 'Argentina (3ª estrella)' },
  { q: '¿Última vez de un Mundial en México?', a: '1986, campeón Argentina' },
];

const RANKING = [
  { name: 'El Profe',    pts: 47 },
  { name: 'FutbolMx',    pts: 39 },
  { name: 'Tigre123',    pts: 35 },
  { name: 'MundialFan',  pts: 31 },
  { name: 'GolazoTV',    pts: 28 },
  { name: 'Cancha26',    pts: 22 },
  { name: 'TuPlayer',    pts: 18 },
  { name: 'TVFan2026',   pts: 14 },
];

// ── Helpers de formato ─────────────────────────────────────────────────────
function fmtMatchTime(iso) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

  const dMid = new Date(iso); dMid.setHours(0,0,0,0);
  const nMid = new Date();    nMid.setHours(0,0,0,0);
  const dayDiff = Math.round((dMid - nMid) / 86400000);

  let day;
  if (dayDiff === 0) day = 'Hoy';
  else if (dayDiff === 1) day = 'Mañana';
  else if (dayDiff === -1) day = 'Ayer';
  else day = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

  return { day, time };
}
