import type { TimeOfDay } from '@/content/quotes';

/** Everything that makes one welcome-banner look different from another (PRD §8.1). 10 looks per time of day. */

export type SunFace = 'smile' | 'wink' | 'sleepy' | 'happy' | 'open' | 'shades';
export type RayStyle = 'lines' | 'tri' | 'dots';
export type MoonKind = 'crescent' | 'full' | 'face' | 'half';
export type GroundKind = 'hills' | 'mountains' | 'sea' | 'dunes' | 'city';
export type ExtraKind =
  | 'birds'
  | 'balloon'
  | 'kite'
  | 'butterflies'
  | 'flowers'
  | 'windmill'
  | 'house'
  | 'trees'
  | 'plane'
  | 'rainbow'
  | 'sailboat'
  | 'palm'
  | 'lantern'
  | 'owl'
  | 'shoot'
  | 'fireflies'
  | 'planet'
  | 'aurora';

export type Look = {
  sky: [string, string, string];
  /** Sun face for day looks; moon kind for night looks. */
  face: SunFace | MoonKind;
  rays?: RayStyle;
  ground: GroundKind;
  /** Which of the two ground colour palettes for this time of day. */
  pal: 0 | 1;
  extras: ExtraKind[];
};

/** Fixed size every scene is drawn in; layers scale it to the card. */
export const SCENE_W = 360;
export const SCENE_H = 300;

export type GroundColors = {
  /** [back fill, front fill, back stroke, front stroke] */
  hills: [string, string, string, string][];
  sea: [string, string];
  sand: [string, string];
  mountain: [string, string];
  city: string;
};

export const GROUND: Record<TimeOfDay, GroundColors> = {
  morning: {
    hills: [['#B7DB9E', '#9CCB84', '#8DB872', '#7DAE64'], ['#D5E8A0', '#BBD97F', '#A9C86A', '#97B857']],
    sea: ['#BFE3F2', '#8FCBE3'],
    sand: ['#F7E2B0', '#EBCB86'],
    mountain: ['#C9D6E4', '#AFC0D4'],
    city: '#B7A9C9',
  },
  afternoon: {
    hills: [['#A8D68C', '#8CC572', '#7DB562', '#6EA855'], ['#C4E58A', '#A7D46C', '#94C25A', '#82B04C']],
    sea: ['#7CC8EA', '#4FA9D6'],
    sand: ['#F4D58B', '#E8BC65'],
    mountain: ['#A9BBD0', '#8DA3BF'],
    city: '#8E7FA8',
  },
  sunset: {
    hills: [['#9B6F8E', '#7C557A', '#85607F', '#684868'], ['#C27A5A', '#A25F4A', '#8F4F3C', '#744030']],
    sea: ['#F2A58A', '#C9708A'],
    sand: ['#E8A36B', '#C97B50'],
    mountain: ['#B07A9A', '#8E5F86'],
    city: '#4A3B5C',
  },
  night: {
    hills: [['#2D3660', '#232B50', '#3A4575', '#303A66'], ['#1F4A5A', '#183A48', '#2A5C6E', '#224D5D']],
    sea: ['#27427A', '#1C3260'],
    sand: ['#3B4A7A', '#2D3A66'],
    mountain: ['#3A4A78', '#2C3A66'],
    city: '#171B3A',
  },
};

const L = (
  sky: Look['sky'],
  face: Look['face'],
  rays: RayStyle | undefined,
  ground: GroundKind,
  pal: 0 | 1,
  extras: ExtraKind[]
): Look => ({ sky, face, rays, ground, pal, extras });

export const LOOKS: Record<TimeOfDay, Look[]> = {
  morning: [
    L(['#FFE7B0', '#FFEFD0', '#FFF6E2'], 'smile', 'lines', 'hills', 0, ['birds']),
    L(['#FFD9C0', '#FFE6D4', '#FFF1E6'], 'sleepy', 'tri', 'hills', 1, ['balloon']),
    L(['#D8ECFF', '#EEF3EE', '#FFF6DD'], 'wink', 'lines', 'mountains', 0, ['birds', 'kite']),
    L(['#FFE0F0', '#FFEBEA', '#FFF3E0'], 'happy', 'dots', 'hills', 0, ['butterflies', 'flowers']),
    L(['#E7F7D2', '#F4F8D8', '#FFF9E0'], 'smile', 'tri', 'hills', 1, ['windmill']),
    L(['#FFEFA8', '#FFF5C9', '#FFFBEA'], 'open', 'lines', 'hills', 0, ['house', 'birds']),
    L(['#CFE3FF', '#EFE6E6', '#FFE9D6'], 'wink', 'tri', 'sea', 0, ['sailboat']),
    L(['#FFD1B8', '#FFE2C0', '#FFF0D0'], 'smile', 'lines', 'dunes', 0, ['birds']),
    L(['#E9E1FF', '#F3EAF2', '#FFF4E3'], 'sleepy', 'dots', 'hills', 1, ['trees', 'plane']),
    L(['#C9F1E7', '#E2F5E4', '#FFF8E1'], 'happy', 'tri', 'mountains', 1, ['balloon', 'birds']),
  ],
  afternoon: [
    L(['#9FD8F5', '#C8EBFB', '#E8F7FF'], 'shades', 'lines', 'hills', 0, ['birds']),
    L(['#BFE6FA', '#E1F2EE', '#FFF7D6'], 'smile', 'tri', 'hills', 1, ['kite']),
    L(['#8CCBF0', '#B8E1F8', '#D8F0FF'], 'open', 'lines', 'sea', 0, ['sailboat', 'birds']),
    L(['#A8DCF7', '#D2EEFB', '#F4FBFF'], 'happy', 'dots', 'hills', 0, ['rainbow']),
    L(['#B3E0F5', '#DDEFEE', '#FFF4CF'], 'wink', 'tri', 'mountains', 0, ['plane']),
    L(['#9ED6F2', '#C6E9FA', '#E3F6FF'], 'shades', 'tri', 'hills', 1, ['windmill', 'birds']),
    L(['#C4E8FA', '#E6F3EA', '#FFFBE3'], 'smile', 'lines', 'dunes', 0, ['balloon']),
    L(['#A5D9F6', '#CDEBFA', '#F0FAFF'], 'open', 'dots', 'hills', 0, ['butterflies', 'flowers']),
    L(['#87C5EE', '#B4DDF6', '#DDF1FF'], 'wink', 'lines', 'hills', 1, ['house', 'trees']),
    L(['#B9E3F8', '#E3F0EC', '#FFF1D0'], 'happy', 'tri', 'mountains', 1, ['kite', 'birds']),
  ],
  sunset: [
    L(['#F6A5A0', '#FFC48A', '#FFE3B3'], 'sleepy', 'lines', 'hills', 0, ['birds']),
    L(['#B58AC9', '#F7A8A0', '#FFD7A8'], 'smile', 'tri', 'sea', 0, ['sailboat']),
    L(['#F28C6B', '#FFB36B', '#FFE0A0'], 'happy', 'lines', 'dunes', 1, ['palm', 'birds']),
    L(['#7E6AB8', '#E58FA6', '#FFC995'], 'sleepy', 'dots', 'hills', 0, ['balloon']),
    L(['#FF9A8B', '#FFC3A0', '#FFEFD0'], 'wink', 'tri', 'mountains', 1, ['birds']),
    L(['#F7B267', '#F79D84', '#FFD6B0'], 'smile', 'lines', 'city', 0, ['plane']),
    L(['#C471A5', '#F7A07A', '#FFD9A0'], 'open', 'tri', 'sea', 0, ['birds']),
    L(['#FF8E72', '#FFB88C', '#FFE6B8'], 'sleepy', 'dots', 'hills', 1, ['windmill']),
    L(['#9D7BC5', '#F29CB0', '#FFD3A5'], 'happy', 'lines', 'dunes', 1, ['palm']),
    L(['#F9A38C', '#FFCB9A', '#FFF0CF'], 'wink', 'tri', 'hills', 0, ['lantern', 'birds']),
  ],
  night: [
    L(['#141733', '#232B55', '#2D3560'], 'crescent', undefined, 'hills', 0, ['owl']),
    L(['#0F1D3A', '#1A2F57', '#1F3B66'], 'full', undefined, 'sea', 0, ['shoot']),
    L(['#1A1233', '#2D2150', '#42285E'], 'face', undefined, 'hills', 0, ['fireflies']),
    L(['#0C2230', '#173B4A', '#1F4A5A'], 'crescent', undefined, 'mountains', 1, ['aurora']),
    L(['#1B1B3A', '#2A2656', '#3B2D63'], 'half', undefined, 'city', 0, ['lantern']),
    L(['#101A2E', '#1B2A4A', '#2A3B64'], 'full', undefined, 'hills', 1, ['planet']),
    L(['#220F2E', '#3A1F4C', '#4A2A5E'], 'face', undefined, 'dunes', 0, ['shoot']),
    L(['#0B1530', '#14274F', '#1E3A6E'], 'crescent', undefined, 'sea', 0, ['sailboat']),
    L(['#16132E', '#262050', '#352A68'], 'half', undefined, 'hills', 1, ['owl', 'fireflies']),
    L(['#0E1C2B', '#16324A', '#21496A'], 'full', undefined, 'city', 1, ['shoot', 'lantern']),
  ],
};

export const GREETING: Record<TimeOfDay, { hello: string; sub: string }> = {
  morning: { hello: 'Good morning', sub: 'A fresh page is waiting.' },
  afternoon: { hello: 'Good afternoon', sub: 'Keep the momentum going.' },
  sunset: { hello: 'Good evening', sub: 'The day is settling down.' },
  night: { hello: 'Good night', sub: 'Time to let the day go.' },
};

/** The subtle page background behind Home, per time of day. Night is dark navy, so its text colours flip too. */
export const WELCOME_PALETTE: Record<
  TimeOfDay,
  { background: string; backgroundElement: string; backgroundSelected: string; text: string; textSecondary: string; dark: boolean }
> = {
  morning: { background: '#FFF3DC', backgroundElement: '#F8E7C8', backgroundSelected: '#EFD9B0', text: '#2B211C', textSecondary: '#6B5F55', dark: false },
  afternoon: { background: '#FFF9E3', backgroundElement: '#F6EFD2', backgroundSelected: '#EBE2BC', text: '#2B211C', textSecondary: '#6B5F55', dark: false },
  sunset: { background: '#FBE5D8', backgroundElement: '#F5D7C6', backgroundSelected: '#EBC6B1', text: '#3A2420', textSecondary: '#7D5A50', dark: false },
  night: { background: '#1E2240', backgroundElement: '#2B3058', backgroundSelected: '#383E6C', text: '#F2EEE6', textSecondary: '#B3B0C8', dark: true },
};
