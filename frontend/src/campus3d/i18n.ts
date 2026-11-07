export type Lang = 'en' | 'ta';

const STRINGS = {
  search: { en: 'Search buildings or rooms…', ta: 'கட்டடம் அல்லது அறையைத் தேடுங்கள்…' },
  from: { en: 'From', ta: 'இருந்து' },
  mainGate: { en: 'Main Gate', ta: 'பிரதான வாயில்' },
  myLocation: { en: 'My location', ta: 'என் இருப்பிடம்' },
  directions: { en: 'Directions', ta: 'வழி' },
  walkHere: { en: 'Walk here', ta: 'இங்கே நடக்கவும்' },
  floors: { en: 'Floors', ta: 'தளங்கள்' },
  indoor: { en: 'Indoor plan', ta: 'உள் வரைபடம்' },
  exitIndoor: { en: 'Exit indoor view', ta: 'உள் பார்வையிலிருந்து வெளியேறு' },
  names: { en: 'Names', ta: 'பெயர்கள்' },
  walk: { en: 'Walk', ta: 'நட' },
  drive: { en: 'Drive', ta: 'ஓட்டு' },
  orbit: { en: 'Map view', ta: 'வரைபட பார்வை' },
  tour: { en: 'Grand Tour', ta: 'சுற்றுலா' },
  stopTour: { en: 'Stop tour', ta: 'சுற்றுலா நிறுத்து' },
  preview: { en: 'Preview route', ta: 'வழியை முன்னோட்டம்' },
  clear: { en: 'Clear', ta: 'அழி' },
  min: { en: 'min', ta: 'நிமி' },
  walkMin: { en: 'min walk', ta: 'நிமி நடை' },
  eta: { en: 'ETA', ta: 'வருகை' },
  floorsEst: { en: 'floors (estimated)', ta: 'தளங்கள் (மதிப்பீடு)' },
  floorsCount: { en: 'floors', ta: 'தளங்கள்' },
  sample: { en: 'Sample layout. Real room data coming soon.', ta: 'மாதிரி அமைப்பு. உண்மையான அறைத் தகவல் விரைவில்.' },
  auto: { en: 'Live time', ta: 'நேரலை நேரம்' },
  day: { en: 'Day', ta: 'பகல்' },
  night: { en: 'Night', ta: 'இரவு' },
  map2d: { en: '2D map', ta: '2D வரைபடம்' },
  noResults: { en: 'No matches', ta: 'பொருத்தம் இல்லை' },
  room: { en: 'Room', ta: 'அறை' },
  building: { en: 'Building', ta: 'கட்டடம்' },
  driveHint: { en: 'Arrow keys / WASD or the joystick to drive. Space to brake.', ta: 'ஓட்ட அம்புக்குறிகள் / WASD அல்லது ஜாய்ஸ்டிக்.' },
  walkHint: { en: 'Arrow keys / WASD or the joystick to walk. Drag to look around.', ta: 'நடக்க அம்புக்குறிகள் / WASD அல்லது ஜாய்ஸ்டிக். சுற்றிப் பார்க்க இழுக்கவும்.' },
  tapTakeOver: { en: 'Route preview · tap anywhere to take over', ta: 'வழி முன்னோட்டம் · கட்டுப்படுத்த தொடவும்' },
  youAreHere: { en: 'You are here', ta: 'நீங்கள் இங்கே' },
  offCampus: { en: 'You are outside campus, so routes start at the Main Gate.', ta: 'நீங்கள் வளாகத்திற்கு வெளியே உள்ளீர்கள்; வழி பிரதான வாயிலிலிருந்து.' },
  loading: { en: 'Building the campus…', ta: 'வளாகம் உருவாகிறது…' },
  noWebgl: { en: 'Your device cannot show 3D. Opening the 2D map instead.', ta: 'உங்கள் சாதனம் 3D காட்ட இயலாது.' },
} as const;

export type StrKey = keyof typeof STRINGS;
export const t = (k: StrKey, lang: Lang) => STRINGS[k][lang];

/** Tamil building names (by source name in the GIS data). */
export const TA_NAMES: Record<string, string> = {
  'Main Block': 'பிரதான கட்டடம்',
  'EB Block': 'EB கட்டடம்',
  'Block 2': 'கட்டடம் 2',
  'Block 3': 'கட்டடம் 3',
  'Canteen Block': 'உணவக கட்டடம்',
  Office: 'நிர்வாக கட்டடம்',
  'Dental Block': 'பல் மருத்துவ கட்டடம்',
  'Mechanical Block': 'இயந்திரவியல் கட்டடம்',
  'Civil Block': 'கட்டடவியல் கட்டடம்',
  'Girls Hostel': 'மாணவியர் விடுதி',
  'Academic Block': 'கல்வி கட்டடம்',
  'Automobile Dept': 'ஆட்டோமொபைல் துறை',
  'Mech Parking': 'இயந்திரவியல் வாகன நிறுத்தம்',
  'Bus Parking': 'பேருந்து நிறுத்தம்',
  Temple: 'கோயில்',
  'Cricket Nets': 'கிரிக்கெட் வலை',
  'Student Parking': 'மாணவர் வாகன நிறுத்தம்',
  'Staff Parking': 'ஊழியர் வாகன நிறுத்தம்',
  OAT: 'திறந்தவெளி அரங்கம்',
  TRP: 'TRP அரங்கம்',
  Playground: 'விளையாட்டு மைதானம்',
};

export const buildingLabel = (b: { name: string; sourceName: string }, lang: Lang) =>
  lang === 'ta' ? TA_NAMES[b.sourceName] ?? b.name : b.name;
