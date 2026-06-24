// ── TVContigo — Data Layer (datos reales lacancha.tv · Mundial 2026) ───────
// El partido EN VIVO y su marcador se auto-sincronizan desde lacancha.tv vía
// los cron/edge-functions (auto-live, sync-score). NO marcar a mano como
// 'finished' el partido que sigue en vivo: crea duplicados. Editar aquí solo
// el calendario estático (próximos) y resultados ya caídos de la señal en vivo.

// Slug del partido EN VIVO en embed.st — actualizar cuando cambie el partido
const LIVE_SLUG = 'ppv-tunisia-vs-japan';
const ES = (n) => `https://embed.st/embed/admin/${LIVE_SLUG}/${n}`;

// Canal priority: Telemundo/DSports (español) → FS1/TSN/Peacock (inglés) → europeos
function chRank(c) {
  const nm  = String(c.name || '').toUpperCase();
  const opt = String(c.option || '').toUpperCase();
  const opN = parseInt((opt.match(/\d+/) || ['1'])[0], 10);
  const PRIO = [
    'TELEMUNDO', 'DSPORTS',
    'FS1', 'TSN', 'PEACOCK',
    'ITV1', 'BEIN', 'DAZN',
    'FUSSBALL', 'DAS ERSTE', 'SERVUS',
    'ZDF', 'ORF', 'BBC',
  ];
  const base = PRIO.findIndex(k => nm.includes(k));
  return (base === -1 ? 90 : base) * 10 + (opN - 1);
}
function sortChannels(list) {
  return list.map((c, i) => ({ c, i }))
    .sort((a, b) => (chRank(a.c) - chRank(b.c)) || (a.i - b.i))
    .map(x => x.c);
}

// Construye la lista de canales desde un slug + definición (usado por live_config)
function buildChannels(slug, list) {
  const built = list.map(c => ({
    id: c.id, name: c.name, option: c.option, tag: c.tag || '',
    url: `https://embed.st/embed/admin/${slug}/${c.n}`, live: true,
  }));
  return sortChannels(built);
}

// Canales reales actuales (default — se sobrescribe con Supabase live_config)
// Números de stream (n) corresponden al slug activo en embed.st — el admin los ajusta por partido
let CHANNELS = [
  // ── Español ───────────────────────────────────────────────────────────────
  { id: 'telemundo-1',  name: 'TELEMUNDO',              option: 'OPCIÓN 1', tag: 'PARTIDO', url: ES(7),  live: true },
  { id: 'telemundo-2',  name: 'TELEMUNDO',              option: 'OPCIÓN 2', tag: 'PARTIDO', url: ES(8),  live: true },
  { id: 'telemundo-3',  name: 'TELEMUNDO',              option: 'OPCIÓN 3', tag: 'PARTIDO', url: ES(13), live: true },
  { id: 'dsports-1',    name: 'DSPORTS',                option: 'OPCIÓN 1', tag: 'PARTIDO', url: ES(14), live: true },
  { id: 'dsports-2',    name: 'DSPORTS',                option: 'OPCIÓN 2', tag: 'NO ADS',  url: ES(15), live: true },
  // ── Inglés (EE.UU. / Canadá) ─────────────────────────────────────────────
  { id: 'fs1-1',        name: 'FS1',                    option: 'OPCIÓN 1', tag: 'PARTIDO', url: ES(3),  live: true },
  { id: 'fs1-2',        name: 'FS1',                    option: 'OPCIÓN 2', tag: 'PARTIDO', url: ES(4),  live: true },
  { id: 'fs1-4k',       name: 'FS1 4K (HEVC)',          option: 'OPCIÓN 1', tag: 'PARTIDO', url: ES(16), live: true },
  { id: 'tsn-1',        name: 'TSN',                    option: 'OPCIÓN 1', tag: 'PARTIDO', url: ES(1),  live: true },
  { id: 'tsn-2',        name: 'TSN',                    option: 'OPCIÓN 2', tag: 'PARTIDO', url: ES(2),  live: true },
  { id: 'peacock-1',    name: 'PEACOCK 4K (HEVC)',       option: 'OPCIÓN 1', tag: 'PARTIDO', url: ES(17), live: true },
  // ── Europa ────────────────────────────────────────────────────────────────
  { id: 'itv1-1',       name: 'ITV1',                   option: 'OPCIÓN 1', tag: 'PARTIDO', url: ES(18), live: true },
  { id: 'itv1-2',       name: 'ITV1',                   option: 'OPCIÓN 2', tag: 'PARTIDO', url: ES(19), live: true },
  { id: 'itv1-3',       name: 'ITV1',                   option: 'OPCIÓN 3', tag: 'PARTIDO', url: ES(20), live: true },
  { id: 'bein-1',       name: 'BEIN SPORTS',            option: 'OPCIÓN 1', tag: 'PARTIDO', url: ES(21), live: true },
  { id: 'bein-2',       name: 'BEIN SPORTS',            option: 'OPCIÓN 2', tag: 'PARTIDO', url: ES(22), live: true },
  { id: 'bein-3',       name: 'BEIN SPORTS',            option: 'OPCIÓN 3', tag: 'PARTIDO', url: ES(23), live: true },
  { id: 'dazn-1',       name: 'DAZN SPAIN',             option: 'OPCIÓN 1', tag: 'PARTIDO', url: ES(24), live: true },
  { id: 'dazn-2',       name: 'DAZN SPAIN',             option: 'OPCIÓN 2', tag: 'PARTIDO', url: ES(25), live: true },
  { id: 'dazn-3',       name: 'DAZN SPAIN',             option: 'OPCIÓN 3', tag: 'PARTIDO', url: ES(26), live: true },
  { id: 'fussball-1',   name: 'FUSSBALL.TV 1 UHD',      option: 'OPCIÓN 1', tag: 'PARTIDO', url: ES(27), live: true },
  { id: 'fussball-nc',  name: 'FUSSBALL.TV 1 UHD (NC)', option: 'OPCIÓN 1', tag: 'PARTIDO', url: ES(28), live: true },
  { id: 'dasErste-1',   name: 'DAS ERSTE',              option: 'OPCIÓN 1', tag: 'PARTIDO', url: ES(29), live: true },
  { id: 'dasErste-2',   name: 'DAS ERSTE',              option: 'OPCIÓN 2', tag: 'PARTIDO', url: ES(30), live: true },
  { id: 'servus-1',     name: 'SERVUS TV',              option: 'OPCIÓN 1', tag: 'PARTIDO', url: ES(31), live: true },
  { id: 'servus-2',     name: 'SERVUS TV',              option: 'OPCIÓN 2', tag: 'PARTIDO', url: ES(32), live: true },
  { id: 'zdf-1',        name: 'ZDF',                    option: 'OPCIÓN 1', tag: '',        url: ES(9),  live: true },
  { id: 'zdf-2',        name: 'ZDF',                    option: 'OPCIÓN 2', tag: '',        url: ES(10), live: true },
  { id: 'orf-1',        name: 'ORF 1',                  option: 'OPCIÓN 1', tag: '',        url: ES(11), live: true },
  { id: 'orf-2',        name: 'ORF 1',                  option: 'OPCIÓN 2', tag: '',        url: ES(12), live: true },
  { id: 'bbc-1',        name: 'BBC ONE',                option: 'OPCIÓN 1', tag: '',        url: ES(5),  live: true },
  { id: 'bbc-2',        name: 'BBC ONE',                option: 'OPCIÓN 2', tag: '',        url: ES(6),  live: true },
];

// Partido EN VIVO actual (se sobrescribe con Supabase live_config en runtime)
let LIVE_MATCH = null;

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
  { id:'m19', home:{name:'Austria',flag:'🇦🇹'}, away:{name:'Jordania',flag:'🇯🇴'}, kickoff:'2026-06-17T04:00:00+00:00', status:'finished', hs:3, as:1, venue:'', city:'', comp:'Jornada 1' },
  { id:'m20', home:{name:'Portugal',flag:'🇵🇹'}, away:{name:'RD Congo',flag:'🇨🇩'}, kickoff:'2026-06-17T17:00:00+00:00', status:'finished', hs:1, as:1, venue:'', city:'', comp:'Jornada 1' },
  { id:'m21', home:{name:'Inglaterra',flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'}, away:{name:'Croacia',flag:'🇭🇷'}, kickoff:'2026-06-17T20:00:00+00:00', status:'finished', hs:4, as:2, venue:'', city:'', comp:'Jornada 1' },
  { id:'m22', home:{name:'Ghana',flag:'🇬🇭'}, away:{name:'Panamá',flag:'🇵🇦'}, kickoff:'2026-06-17T23:00:00+00:00', status:'finished', hs:1, as:0, venue:'', city:'', comp:'Jornada 1' },
  { id:'m23', home:{name:'Uzbekistán',flag:'🇺🇿'}, away:{name:'Colombia',flag:'🇨🇴'}, kickoff:'2026-06-18T02:00:00+00:00', status:'finished', hs:1, as:3, venue:'', city:'', comp:'Jornada 1' },
  { id:'m24', home:{name:'Chequia',flag:'🇨🇿'}, away:{name:'Sudáfrica',flag:'🇿🇦'}, kickoff:'2026-06-18T16:00:00+00:00', status:'finished', hs:1, as:1, venue:'', city:'', comp:'Jornada 2' },
  { id:'m25', home:{name:'Canadá',flag:'🇨🇦'}, away:{name:'Catar',flag:'🇶🇦'}, kickoff:'2026-06-18T22:00:00+00:00', status:'finished', hs:6, as:0, venue:'', city:'', comp:'Jornada 2' },
  { id:'m26', home:{name:'México',flag:'🇲🇽'}, away:{name:'Corea del Sur',flag:'🇰🇷'}, kickoff:'2026-06-19T01:00:00+00:00', status:'finished', hs:1, as:0, venue:'Estadio Akron', city:'Guadalajara', comp:'Jornada 2' },
  { id:'m27', home:{name:'EE.UU.',flag:'🇺🇸'}, away:{name:'Australia',flag:'🇦🇺'}, kickoff:'2026-06-19T19:00:00+00:00', status:'finished', hs:2, as:0, venue:'', city:'', comp:'Jornada 2' },
  { id:'m28', home:{name:'Escocia',flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'}, away:{name:'Marruecos',flag:'🇲🇦'}, kickoff:'2026-06-19T22:00:00+00:00', status:'finished', hs:0, as:1, venue:'', city:'', comp:'Jornada 2' },
  { id:'m29', home:{name:'Brasil',flag:'🇧🇷'}, away:{name:'Haití',flag:'🇭🇹'}, kickoff:'2026-06-20T00:30:00+00:00', status:'finished', hs:3, as:0, venue:'', city:'', comp:'Jornada 2' },
  { id:'m30', home:{name:'Turquía',flag:'🇹🇷'}, away:{name:'Paraguay',flag:'🇵🇾'}, kickoff:'2026-06-20T03:00:00+00:00', status:'finished', hs:0, as:1, venue:'', city:'', comp:'Jornada 2' },
  { id:'m31', home:{name:'Países Bajos',flag:'🇳🇱'}, away:{name:'Suecia',flag:'🇸🇪'}, kickoff:'2026-06-20T17:00:00+00:00', status:'finished', hs:5, as:1, venue:'', city:'', comp:'Jornada 2' },
  { id:'m32', home:{name:'Alemania',flag:'🇩🇪'}, away:{name:'Costa de Marfil',flag:'🇨🇮'}, kickoff:'2026-06-20T20:00:00+00:00', status:'finished', hs:2, as:1, venue:'', city:'', comp:'Jornada 2' },
  { id:'m33', home:{name:'Ecuador',flag:'🇪🇨'}, away:{name:'Curazao',flag:'🇨🇼'}, kickoff:'2026-06-21T00:00:00+00:00', status:'finished', hs:0, as:0, venue:'', city:'', comp:'Jornada 2' },
  { id:'m34', home:{name:'Túnez',flag:'🇹🇳'}, away:{name:'Japón',flag:'🇯🇵'}, kickoff:'2026-06-21T04:00:00+00:00', status:'finished', hs:0, as:4, venue:'', city:'', comp:'Jornada 2' },
  { id:'m35', home:{name:'España',flag:'🇪🇸'}, away:{name:'Arabia Saudita',flag:'🇸🇦'}, kickoff:'2026-06-21T16:00:00+00:00', status:'finished', hs:4, as:0, venue:'', city:'', comp:'Jornada 2' },
  { id:'m36', home:{name:'Bélgica',flag:'🇧🇪'}, away:{name:'Irán',flag:'🇮🇷'}, kickoff:'2026-06-21T19:00:00+00:00', status:'finished', hs:0, as:0, venue:'', city:'', comp:'Jornada 2' },
  { id:'m37', home:{name:'Uruguay',flag:'🇺🇾'}, away:{name:'Cabo Verde',flag:'🇨🇻'}, kickoff:'2026-06-21T22:00:00+00:00', status:'finished', hs:2, as:2, venue:'', city:'', comp:'Jornada 2' },
  { id:'m38', home:{name:'Nueva Zelanda',flag:'🇳🇿'}, away:{name:'Egipto',flag:'🇪🇬'}, kickoff:'2026-06-22T01:00:00+00:00', status:'finished', hs:1, as:3, venue:'', city:'', comp:'Jornada 2' },
  { id:'m39', home:{name:'Argentina',flag:'🇦🇷'}, away:{name:'Austria',flag:'🇦🇹'}, kickoff:'2026-06-22T17:00:00+00:00', status:'finished', hs:2, as:0, venue:'', city:'', comp:'Jornada 2' },
  { id:'m40', home:{name:'Francia',flag:'🇫🇷'}, away:{name:'Irak',flag:'🇮🇶'}, kickoff:'2026-06-22T21:00:00+00:00', status:'finished', hs:3, as:0, venue:'', city:'', comp:'Jornada 2' },
  { id:'m41', home:{name:'Noruega',flag:'🇳🇴'}, away:{name:'Senegal',flag:'🇸🇳'}, kickoff:'2026-06-23T00:00:00+00:00', status:'finished', hs:3, as:2, venue:'', city:'', comp:'Jornada 2' },
  { id:'m42', home:{name:'Jordania',flag:'🇯🇴'}, away:{name:'Argelia',flag:'🇩🇿'}, kickoff:'2026-06-23T03:00:00+00:00', status:'finished', hs:1, as:2, venue:'Estadio Bahía de SF', city:'San Francisco', comp:'Jornada 2' },
  { id:'m43', home:{name:'Portugal',flag:'🇵🇹'}, away:{name:'Uzbekistán',flag:'🇺🇿'}, kickoff:'2026-06-23T17:00:00+00:00', status:'finished', hs:5, as:0, venue:'', city:'', comp:'Jornada 2' },
  { id:'m44', home:{name:'Inglaterra',flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'}, away:{name:'Ghana',flag:'🇬🇭'}, kickoff:'2026-06-23T20:00:00+00:00', status:'finished', hs:0, as:0, venue:'', city:'', comp:'Jornada 2' },
  { id:'m45', home:{name:'Panamá',flag:'🇵🇦'}, away:{name:'Croacia',flag:'🇭🇷'}, kickoff:'2026-06-23T23:00:00+00:00', status:'finished', hs:0, as:1, venue:'', city:'', comp:'Jornada 2' },
  { id:'m46', home:{name:'Colombia',flag:'🇨🇴'}, away:{name:'RD Congo',flag:'🇨🇩'}, kickoff:'2026-06-24T02:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'Estadio Akron', city:'Guadalajara', comp:'Jornada 2' },
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
  { id:'m70', home:{name:'Canadá',flag:'🇨🇦'}, away:{name:'Bosnia',flag:'🇧🇦'}, kickoff:'2026-06-12T19:00:00+00:00', status:'finished', hs:1, as:1, venue:'', city:'', comp:'Jornada 1' },
  { id:'m71', home:{name:'Suiza',flag:'🇨🇭'}, away:{name:'Bosnia',flag:'🇧🇦'}, kickoff:'2026-06-18T19:00:00+00:00', status:'finished', hs:4, as:1, venue:'', city:'', comp:'Jornada 2' },
  { id:'m72', home:{name:'Catar',flag:'🇶🇦'}, away:{name:'Bosnia',flag:'🇧🇦'}, kickoff:'2026-06-24T19:00:00+00:00', status:'scheduled', hs:null, as:null, venue:'', city:'', comp:'Jornada 3' },
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

// Tabla de grupos: equipo → letra del grupo (A-L, derivados del calendario)
const MATCH_GROUPS = {
  'México':'A','Corea del Sur':'A','Chequia':'A','Sudáfrica':'A',
  'EE.UU.':'B','Paraguay':'B','Australia':'B','Turquía':'B',
  'Catar':'C','Suiza':'C','Canadá':'C','Bosnia':'C',
  'Brasil':'D','Marruecos':'D','Haití':'D','Escocia':'D',
  'Alemania':'E','Curazao':'E','Costa de Marfil':'E','Ecuador':'E',
  'Países Bajos':'F','Japón':'F','Suecia':'F','Túnez':'F',
  'España':'G','Cabo Verde':'G','Arabia Saudita':'G','Uruguay':'G',
  'Bélgica':'H','Egipto':'H','Irán':'H','Nueva Zelanda':'H',
  'Francia':'I','Senegal':'I','Irak':'I','Noruega':'I',
  'Argentina':'J','Argelia':'J','Austria':'J','Jordania':'J',
  'Portugal':'K','RD Congo':'K','Uzbekistán':'K','Colombia':'K',
  'Inglaterra':'L','Croacia':'L','Ghana':'L','Panamá':'L',
};

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

// Normaliza el estado de un partido a 'live' | 'final' | 'upcoming'
// y decide si hay un marcador real que mostrar (nunca 0 falso para próximos).
function matchState(m) {
  const hasScore = m.hs != null && m.as != null;
  if (m.status === 'live')                 return { state: 'live',     hasScore };
  if (m.status === 'finished' && hasScore) return { state: 'final',    hasScore: true };
  return { state: 'upcoming', hasScore: false };
}

// ── Sistema de puntos / recompensas (RECREATIVO · sin valor monetario) ──────
const DAILY_MAX = 60;   // tope de puntos que se pueden sumar en un día

const POINTS_RULES = [
  { id:'daily-login',          label:'Inicio de sesión diario', points:5,  frequency:'daily',     icon:'login'  },
  { id:'prediction-submitted', label:'Predicción enviada',      points:10, frequency:'per_match', icon:'check'  },
  { id:'correct-winner',       label:'Acierto de resultado',    points:15, frequency:'per_match', icon:'target' },
  { id:'exact-score',          label:'Marcador exacto',         points:30, frequency:'per_match', icon:'trophy' },
  { id:'daily-streak',         label:'Racha diaria activa',     points:5,  frequency:'daily',     icon:'fire'   },
];

// Niveles de recompensa (gamificación simple, solo entretenimiento)
const REWARD_LEVELS = [
  { name:'Aficionado',           min:0,    max:99,       icon:'star'  },
  { name:'Analista',             min:100,  max:249,      icon:'chart' },
  { name:'Crack de la quiniela', min:250,  max:499,      icon:'ball'  },
  { name:'Maestro del Mundial',  min:500,  max:999,      icon:'medal' },
  { name:'Leyenda TVContigo',    min:1000, max:Infinity, icon:'crown' },
];

// Recompensas simbólicas (sin valor monetario)
const REWARD_ITEMS = [
  { label:'Insignia en el ranking',          icon:'badge'  },
  { label:'Marco especial de perfil',        icon:'frame'  },
  { label:'Mención en la tabla',             icon:'list'   },
  { label:'Acceso anticipado a predicciones',icon:'unlock' },
  { label:'Badge "Top predictor"',           icon:'trophy' },
];

// Retos del día (recreativos)
const DAILY_CHALLENGES = [
  { id:'enter-quiniela',   label:'Entra hoy a la quiniela',         points:5,  icon:'ticket' },
  { id:'predict-featured', label:'Predice el partido destacado',    points:10, icon:'target' },
  { id:'correct-winner',   label:'Acierta un ganador',              points:15, icon:'check'  },
  { id:'share-prediction', label:'Comparte tu predicción',          points:5,  icon:'share'  },
  { id:'keep-streak',      label:'Mantén tu racha diaria',          points:5,  icon:'fire'   },
];

// Devuelve el nivel correspondiente a un total de puntos
function levelFor(total) {
  return REWARD_LEVELS.find(l => total >= l.min && total <= l.max) || REWARD_LEVELS[0];
}

// ── Catálogo de canales (REFERENCIA · solo informativo) ─────────────────────
// Lista pública de canales que transmiten el Mundial por país/idioma. NO son
// streams: la señal en vivo real llega por live_config (auto-sync de lacancha).
// groups: mexico | usa | espana | europa | premium | nocom | hd
const CHANNEL_CATALOG = [
  { name:'Telemundo',          country:'EE.UU.',  lang:'Español', groups:['usa'],                 badge:'PARTIDO' },
  { name:'Universo',           country:'EE.UU.',  lang:'Español', groups:['usa'],                 badge:'PARTIDO' },
  { name:'Peacock 4K',         country:'EE.UU.',  lang:'Inglés',  groups:['usa','premium','hd'],  badge:'4K' },
  { name:'FOX',                country:'EE.UU.',  lang:'Inglés',  groups:['usa'],                 badge:'PARTIDO' },
  { name:'FS1',                country:'EE.UU.',  lang:'Inglés',  groups:['usa'],                 badge:'PARTIDO' },
  { name:'FS2',                country:'EE.UU.',  lang:'Inglés',  groups:['usa'],                 badge:'PARTIDO' },
  { name:'TUDN',               country:'EE.UU./MX', lang:'Español', groups:['usa','mexico'],      badge:'PARTIDO' },
  { name:'ViX',                country:'EE.UU./MX', lang:'Español', groups:['usa','mexico','premium'], badge:'PARTIDO' },
  { name:'Azteca 7',           country:'México',  lang:'Español', groups:['mexico'],              badge:'GRATIS' },
  { name:'Canal 5',            country:'México',  lang:'Español', groups:['mexico'],              badge:'GRATIS' },
  { name:'Las Estrellas',      country:'México',  lang:'Español', groups:['mexico'],              badge:'GRATIS' },
  { name:'Claro Sports',       country:'México',  lang:'Español', groups:['mexico','premium'],    badge:'PARTIDO' },
  { name:'DSports',            country:'LatAm',   lang:'Español', groups:['premium'],             badge:'PARTIDO' },
  { name:'Star+',              country:'LatAm',   lang:'Español', groups:['premium'],             badge:'PARTIDO' },
  { name:'ESPN',               country:'LatAm/EE.UU.', lang:'Multi', groups:['usa','premium'],    badge:'PARTIDO' },
  { name:'DAZN Spain',         country:'España',  lang:'Español', groups:['espana','premium'],    badge:'PARTIDO' },
  { name:'beIN Sports',        country:'España',  lang:'Español', groups:['espana','premium'],    badge:'PARTIDO' },
  { name:'ITV1',               country:'Reino Unido', lang:'Inglés', groups:['europa'],           badge:'PARTIDO' },
  { name:'BBC One',            country:'Reino Unido', lang:'Inglés', groups:['europa'],           badge:'GRATIS' },
  { name:'TSN',                country:'Canadá',  lang:'Inglés',  groups:['premium'],             badge:'PARTIDO' },
  { name:'RDS',                country:'Canadá',  lang:'Francés', groups:['premium'],             badge:'PARTIDO' },
  { name:'Das Erste',          country:'Alemania',lang:'Alemán',  groups:['europa'],              badge:'GRATIS' },
  { name:'ZDF',                country:'Alemania',lang:'Alemán',  groups:['europa'],              badge:'GRATIS' },
  { name:'Servus TV',          country:'Austria', lang:'Alemán',  groups:['europa'],              badge:'PARTIDO' },
  { name:'ORF 1',              country:'Austria', lang:'Alemán',  groups:['europa'],              badge:'GRATIS' },
  { name:'SRF',                country:'Suiza',   lang:'Alemán',  groups:['europa'],              badge:'GRATIS' },
  { name:'RTP',                country:'Portugal',lang:'Portugués',groups:['europa'],             badge:'GRATIS' },
  { name:'SIC',                country:'Portugal',lang:'Portugués',groups:['europa'],             badge:'PARTIDO' },
  { name:'RAI',                country:'Italia',  lang:'Italiano', groups:['europa'],             badge:'GRATIS' },
  { name:'Mediaset',           country:'Italia',  lang:'Italiano', groups:['europa'],             badge:'PARTIDO' },
  { name:'TF1',                country:'Francia', lang:'Francés',  groups:['europa'],             badge:'GRATIS' },
  { name:'M6',                 country:'Francia', lang:'Francés',  groups:['europa'],             badge:'GRATIS' },
  { name:'Fussball.TV 1 UHD',  country:'Alemania',lang:'Alemán',  groups:['europa','hd'],        badge:'4K' },
  { name:'Fussball.TV 1 UHD (No Commentary)', country:'Alemania', lang:'Sin relato', groups:['europa','nocom','hd'], badge:'NO ADS' },
  { name:'FIFA+',              country:'Global',  lang:'Multi',   groups:[],                      badge:'GRATIS' },
];

// Filtros visibles para "Todos los canales"
const CHANNEL_FILTERS = [
  { id:'all',     label:'Todos'           },
  { id:'mexico',  label:'México'          },
  { id:'usa',     label:'USA'             },
  { id:'espana',  label:'España'          },
  { id:'europa',  label:'Europa'          },
  { id:'premium', label:'Premium'         },
  { id:'nocom',   label:'Sin comentarios' },
  { id:'hd',      label:'HD / 4K'         },
];

// ── Dónde se transmite cada partido (REFERENCIA pública · sin streams) ──────
// Estructura lista para que el admin registre fuentes oficiales/autorizadas.
// NUNCA streams piratas, iframes protegidos, proxies ni bypass: solo listados
// públicos, canales oficiales o embeds autorizados.
const BROADCAST_SOURCES = [
  // Ejemplo de formato (rellenar desde el admin con info pública verificada):
  // { matchId:'m50', country:'México', channelName:'Canal 5 / TUDN', sourceType:'official_listing',
  //   sourceUrl:'', embedUrl:'', isAuthorized:true, notes:'Programación pública', lastChecked:'' },
];
