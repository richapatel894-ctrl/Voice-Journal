import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, G, Path, Text as SvgText } from 'react-native-svg';

/**
 * One small hand-drawn character per emotion in the catalog (PRD §6). Original designs: each is a soft
 * blob with its own colour, eyes, mouth and a little extra (a sweat drop, steam, a leaf...). Used on
 * entry rows and tag pills instead of emoji.
 */

const BODY = 'M32 5 C49 5 58 20 57 37 C56 53 45 60 32 60 C18 60 8 52 8 36 C8 20 15 5 32 5Z';
const INK = '#2A1F1C';

type Eyes = 'dots' | 'wide' | 'happy' | 'closed' | 'sad' | 'lid';
type Design = { body: string; edge: string; eyes: Eyes; mouth: ReactNode; extra: ReactNode };

const DESIGNS: Record<string, Design> = {
  Happy: {
    body: '#FFD54A',
    edge: '#E0A800',
    eyes: 'dots',
    mouth: <Path d="M20 38 Q32 52 44 38 Q32 43 20 38Z" fill="#7A3B12" stroke="#7A3B12" strokeWidth={2} strokeLinejoin="round" />,
    extra: (
      <>
        <Circle cx={17} cy={38} r={4.5} fill="#FF9C9C" opacity={0.7} />
        <Circle cx={47} cy={38} r={4.5} fill="#FF9C9C" opacity={0.7} />
      </>
    ),
  },
  Excited: {
    body: '#FF9F45',
    edge: '#D9731A',
    eyes: 'wide',
    mouth: (
      <>
        <Ellipse cx={32} cy={43} rx={8} ry={7} fill="#7A2E10" />
        <Ellipse cx={32} cy={46} rx={4.5} ry={3} fill="#FF7B7B" />
      </>
    ),
    extra: (
      <>
        <Path d="M26 5 L30 -2 L34 5 M32 4 L40 -1" stroke="#D9731A" strokeWidth={3} fill="none" strokeLinecap="round" />
        <Path d="M6 14 l4 3 M58 14 l-4 3" stroke="#FFD54A" strokeWidth={3} strokeLinecap="round" />
      </>
    ),
  },
  Grateful: {
    body: '#FF9EBB',
    edge: '#D96A8E',
    eyes: 'happy',
    mouth: <Path d="M26 41 Q32 47 38 41" stroke="#8A2F4D" strokeWidth={3} fill="none" strokeLinecap="round" />,
    extra: (
      <>
        <Path d="M32 58 C24 52 20 48 24 45 C27 43 30 45 32 48 C34 45 37 43 40 45 C44 48 40 52 32 58Z" fill="#FF5F8A" stroke="#C93A66" strokeWidth={2} />
        <Circle cx={17} cy={37} r={4.5} fill="#FF6F9A" opacity={0.5} />
        <Circle cx={47} cy={37} r={4.5} fill="#FF6F9A" opacity={0.5} />
      </>
    ),
  },
  Calm: {
    body: '#8FD8D0',
    edge: '#4FAFA6',
    eyes: 'closed',
    mouth: <Path d="M26 41 Q32 46 38 41" stroke="#26665F" strokeWidth={3} fill="none" strokeLinecap="round" />,
    extra: <Path d="M30 6 C24 0 28 -3 34 -1 C36 3 33 6 30 6Z" fill="#6DC48A" stroke="#3E9A60" strokeWidth={2} />,
  },
  Confused: {
    body: '#C9B2F2',
    edge: '#8E6FD0',
    eyes: 'dots',
    mouth: <Path d="M23 43 Q27 38 32 43 T41 43" stroke="#4B2E86" strokeWidth={3} fill="none" strokeLinecap="round" />,
    extra: (
      <>
        <Path d="M37 24 L45 21" stroke="#4B2E86" strokeWidth={3} strokeLinecap="round" />
        <SvgText x={46} y={14} fontSize={16} fontWeight="700" fill="#8E6FD0">
          ?
        </SvgText>
      </>
    ),
  },
  Anxious: {
    body: '#BFE08A',
    edge: '#8DB84A',
    eyes: 'wide',
    mouth: <Path d="M23 44 Q26 40 29 44 T35 44 T41 44" stroke="#4C6A1A" strokeWidth={3} fill="none" strokeLinecap="round" />,
    extra: (
      <>
        <Path d="M52 18 C55 24 50 26 50 22 C50 20 52 18 52 18Z" fill="#8EDCFF" stroke="#4FA9D6" strokeWidth={1.5} />
        <Path d="M14 6 l3 6 M24 3 l1 7 M40 3 l-1 7 M50 8 l-3 6" stroke="#8DB84A" strokeWidth={3} strokeLinecap="round" />
      </>
    ),
  },
  Angry: {
    body: '#FF7A6B',
    edge: '#D3402F',
    eyes: 'dots',
    mouth: <Path d="M24 45 Q32 38 40 45" stroke="#6E1A10" strokeWidth={3.2} fill="none" strokeLinecap="round" />,
    extra: (
      <>
        <Path d="M18 24 L29 30 M46 24 L35 30" stroke="#6E1A10" strokeWidth={4} strokeLinecap="round" />
        <Path d="M12 8 q-3 -5 1 -8 M52 8 q3 -5 -1 -8" stroke="#D3402F" strokeWidth={3} fill="none" strokeLinecap="round" />
      </>
    ),
  },
  Sad: {
    body: '#8EB6F5',
    edge: '#4F82D6',
    eyes: 'sad',
    mouth: <Path d="M25 46 Q32 40 39 46" stroke="#1F3F7A" strokeWidth={3} fill="none" strokeLinecap="round" />,
    extra: <Path d="M22 36 C25 41 19 43 20 38Z" fill="#CFE6FF" stroke="#4F82D6" strokeWidth={1.5} />,
  },
  Disappointed: {
    body: '#B7A9C9',
    edge: '#8274A0',
    eyes: 'lid',
    mouth: <Path d="M25 45 L39 45" stroke="#42365A" strokeWidth={3} strokeLinecap="round" />,
    extra: null,
  },
  Tired: {
    body: '#8D93D9',
    edge: '#5C63B5',
    eyes: 'lid',
    mouth: <Ellipse cx={32} cy={45} rx={4} ry={2.6} fill="#2E3270" />,
    extra: (
      <>
        <Path d="M20 38 q4 3 8 0 M36 38 q4 3 8 0" stroke="#5C63B5" strokeWidth={2} fill="none" opacity={0.6} />
        <SvgText x={44} y={14} fontSize={13} fontWeight="700" fill="#5C63B5">
          z
        </SvgText>
        <SvgText x={51} y={6} fontSize={9} fontWeight="700" fill="#5C63B5">
          z
        </SvgText>
      </>
    ),
  },
};

function EyesArt({ kind }: { kind: Eyes }) {
  switch (kind) {
    case 'dots':
      return (
        <>
          <Circle cx={24} cy={30} r={3.6} fill={INK} />
          <Circle cx={40} cy={30} r={3.6} fill={INK} />
        </>
      );
    case 'wide':
      return (
        <>
          <Circle cx={24} cy={29} r={6} fill="#fff" stroke={INK} strokeWidth={2} />
          <Circle cx={40} cy={29} r={6} fill="#fff" stroke={INK} strokeWidth={2} />
          <Circle cx={25} cy={30} r={2.6} fill={INK} />
          <Circle cx={39} cy={30} r={2.6} fill={INK} />
        </>
      );
    case 'happy':
      return <Path d="M19 31 Q24 24 29 31 M35 31 Q40 24 45 31" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case 'closed':
      return <Path d="M19 30 Q24 35 29 30 M35 30 Q40 35 45 30" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case 'sad':
      return (
        <>
          <Circle cx={24} cy={31} r={3.6} fill={INK} />
          <Circle cx={40} cy={31} r={3.6} fill={INK} />
          <Path d="M18 24 L29 27 M46 24 L35 27" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
        </>
      );
    case 'lid':
      return (
        <>
          <Path d="M19 31 H29 M35 31 H45" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <Path d="M19 31 Q24 25 29 31 M35 31 Q40 25 45 31" fill={INK} opacity={0.18} />
        </>
      );
  }
}

/** Emotions outside the catalog (or a missing one) get no mascot. */
export function hasMascot(emotion: string): boolean {
  return emotion in DESIGNS;
}

export function EmotionMascot({ emotion, size = 48 }: { emotion: string; size?: number }) {
  const d = DESIGNS[emotion];
  if (!d) return null;
  return (
    <Svg width={size} height={size * (78 / 72)} viewBox="-4 -12 72 78" accessibilityLabel={emotion}>
      <G>
        <Path d={BODY} fill={d.body} stroke={d.edge} strokeWidth={3} strokeLinejoin="round" />
        {d.extra}
        <EyesArt kind={d.eyes} />
        {d.mouth}
      </G>
    </Svg>
  );
}
