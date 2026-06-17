// ── TVContigo — Data Layer ────────────────────────────────────────────────

// Actualiza este slug con el partido en vivo de lacancha.tv
const LIVE_SLUG = 'ppv-iraq-vs-norway';
const ES = (n) => `https://embed.st/embed/admin/${LIVE_SLUG}/${n}`;

const CHANNELS = [
  { id: 'telemundo-1', name: 'TELEMUNDO',      option: 'HD', url: ES(5), live: true },
  { id: 'telemundo-2', name: 'TELEMUNDO',      option: 'SD', url: ES(6), live: true },
  { id: 'fox-1',       name: 'FOX SPORTS',     option: 'HD', url: ES(1), live: true },
  { id: 'fox-2',       name: 'FOX SPORTS',     option: 'SD', url: ES(2), live: true },
  { id: 'bbc-1',       name: 'BBC ONE',         option: 'HD', url: ES(3), live: true },
  { id: 'bbc-2',       name: 'BBC ONE',         option: 'SD', url: ES(4), live: true },
  { id: 'tsn-1',       name: 'TSN',             option: 'HD', url: ES(7), live: true },
  { id: 'tsn-2',       name: 'TSN',             option: 'SD', url: ES(8), live: true },
  { id: 'orf-1',       name: 'ORF1',            option: 'HD', url: ES(9), live: true },
  { id: 'orf-2',       name: 'ORF1',            option: 'SD', url: ES(10), live: true },
];

const MATCHES = [
  {
    id: 'match-live-1',
    home: { name: 'Iraq',   flag: '🇮🇶' },
    away: { name: 'Noruega', flag: '🇳🇴' },
    status: 'live', score: '0 - 0', time: '45\'',
    competition: 'Grupo D · Jornada 2',
    defaultChannel: 'telemundo-1',
  },
  {
    id: 'match-2',
    home: { name: 'Argentina', flag: '🇦🇷' },
    away: { name: 'Chile',     flag: '🇨🇱' },
    status: 'upcoming', time: '18:00', date: 'Hoy',
    competition: 'Grupo A · Jornada 2',
  },
  {
    id: 'match-3',
    home: { name: 'México',  flag: '🇲🇽' },
    away: { name: 'Ecuador', flag: '🇪🇨' },
    status: 'upcoming', time: '20:00', date: 'Hoy',
    competition: 'Grupo B · Jornada 2',
  },
  {
    id: 'match-4',
    home: { name: 'Brasil',  flag: '🇧🇷' },
    away: { name: 'Suiza',   flag: '🇨🇭' },
    status: 'upcoming', time: '22:00', date: 'Hoy',
    competition: 'Grupo C · Jornada 2',
  },
  {
    id: 'match-5',
    home: { name: 'España',  flag: '🇪🇸' },
    away: { name: 'Marruecos', flag: '🇲🇦' },
    status: 'upcoming', time: '17:00', date: 'Mañana',
    competition: 'Grupo E · Jornada 2',
  },
  {
    id: 'match-6',
    home: { name: 'Francia', flag: '🇫🇷' },
    away: { name: 'Polonia', flag: '🇵🇱' },
    status: 'upcoming', time: '19:00', date: 'Mañana',
    competition: 'Grupo F · Jornada 2',
  },
  {
    id: 'match-7',
    home: { name: 'Alemania', flag: '🇩🇪' },
    away: { name: 'Japón',    flag: '🇯🇵' },
    status: 'upcoming', time: '21:00', date: 'Mañana',
    competition: 'Grupo G · Jornada 2',
  },
  {
    id: 'match-8',
    home: { name: 'Portugal', flag: '🇵🇹' },
    away: { name: 'Uruguay',  flag: '🇺🇾' },
    status: 'upcoming', time: '23:00', date: 'Mañana',
    competition: 'Grupo H · Jornada 2',
  },
  {
    id: 'match-9',
    home: { name: 'EE.UU.',  flag: '🇺🇸' },
    away: { name: 'Panamá',  flag: '🇵🇦' },
    status: 'upcoming', time: '16:00', date: 'Miérc.',
    competition: 'Grupo I · Jornada 2',
  },
  {
    id: 'match-10',
    home: { name: 'Canadá', flag: '🇨🇦' },
    away: { name: 'Bélgica', flag: '🇧🇪' },
    status: 'upcoming', time: '18:00', date: 'Miérc.',
    competition: 'Grupo J · Jornada 2',
  },
];

const RESULTS = [
  { home: { name: 'México',    flag: '🇲🇽' }, score: '2 - 0', away: { name: 'Camerún',   flag: '🇨🇲' }, comp: 'Grupo B · J1' },
  { home: { name: 'Alemania',  flag: '🇩🇪' }, score: '7 - 1', away: { name: 'Haití',     flag: '🇭🇹' }, comp: 'Grupo G · J1' },
  { home: { name: 'Francia',   flag: '🇫🇷' }, score: '3 - 1', away: { name: 'Bolivia',   flag: '🇧🇴' }, comp: 'Grupo F · J1' },
  { home: { name: 'Brasil',    flag: '🇧🇷' }, score: '4 - 0', away: { name: 'Tanzania',  flag: '🇹🇿' }, comp: 'Grupo C · J1' },
  { home: { name: 'Argentina', flag: '🇦🇷' }, score: '3 - 0', away: { name: 'Perú',      flag: '🇵🇪' }, comp: 'Grupo A · J1' },
  { home: { name: 'España',    flag: '🇪🇸' }, score: '5 - 0', away: { name: 'Túnez',     flag: '🇹🇳' }, comp: 'Grupo E · J1' },
  { home: { name: 'EE.UU.',   flag: '🇺🇸' }, score: '2 - 1', away: { name: 'Ghana',     flag: '🇬🇭' }, comp: 'Grupo I · J1' },
  { home: { name: 'Portugal',  flag: '🇵🇹' }, score: '3 - 2', away: { name: 'Costa Rica', flag: '🇨🇷' }, comp: 'Grupo H · J1' },
  { home: { name: 'Japón',     flag: '🇯🇵' }, score: '1 - 0', away: { name: 'Senegal',   flag: '🇸🇳' }, comp: 'Grupo G · J1' },
  { home: { name: 'Canadá',   flag: '🇨🇦' }, score: '2 - 0', away: { name: 'Kuwait',    flag: '🇰🇼' }, comp: 'Grupo J · J1' },
  { home: { name: 'Marruecos', flag: '🇲🇦' }, score: '2 - 1', away: { name: 'Croacia',   flag: '🇭🇷' }, comp: 'Grupo E · J1' },
  { home: { name: 'Noruega',  flag: '🇳🇴' }, score: '4 - 0', away: { name: 'Sierra Leona', flag: '🇸🇱' }, comp: 'Grupo D · J1' },
];

const TRIVIA = [
  { q: '¿Cuántos países clasificaron al Mundial 2026?', a: '48 selecciones' },
  { q: '¿Cuántos partidos se jugarán en total?', a: '104 partidos' },
  { q: '¿Qué países son sede del Mundial 2026?', a: 'México, Estados Unidos y Canadá' },
  { q: '¿Cuántos estadios albergarán el Mundial?', a: '16 estadios en 3 países' },
  { q: '¿En qué estadio se jugará la final?', a: 'MetLife Stadium, Nueva York' },
  { q: '¿Cuántos goles se anotaron en el Mundial 2022?', a: '172 goles en 64 partidos' },
  { q: '¿Qué país ganó el Mundial 2022?', a: 'Argentina (3ª estrella)' },
  { q: '¿Cuándo fue el último Mundial en México?', a: '1986, campeón Argentina' },
];

const RANKING = [
  { name: 'El Profe',    pts: 47 },
  { name: 'FutbolMx',   pts: 39 },
  { name: 'Tigre123',   pts: 35 },
  { name: 'MundialFan', pts: 31 },
  { name: 'GolazoTV',   pts: 28 },
  { name: 'Cancha26',   pts: 22 },
  { name: 'TuPlayer',   pts: 18 },
  { name: 'TVFan2026',  pts: 14 },
];
