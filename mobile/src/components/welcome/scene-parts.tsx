import {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Mask,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import type { TimeOfDay } from '@/content/quotes';
import {
  GROUND,
  SCENE_H,
  SCENE_W,
  type GroundKind,
  type MoonKind,
  type RayStyle,
  type SunFace,
} from '@/components/welcome/scene-data';

/* Hand-drawn scene parts in scene units (360 x 300). Colours and shapes follow docs/prototypes/home-welcome.html. */

const INK = '#5B3A1E';

/** Small deterministic random numbers, so a scene always draws the same stars and skyline. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

// ---------------------------------------------------------------- sky
export function Sky({ colors }: { colors: [string, string, string] }) {
  return (
    <>
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors[0]} />
          <Stop offset="0.55" stopColor={colors[1]} />
          <Stop offset="1" stopColor={colors[2]} />
        </LinearGradient>
      </Defs>
      <Rect width={SCENE_W} height={SCENE_H} fill="url(#sky)" />
    </>
  );
}

// ---------------------------------------------------------------- sun (centre 180,150 before the 76,22 offset)
const SUN = { x: 256, y: 172 }; // where the sun's centre sits in the scene
export const SUN_CENTER: [number, number] = [SUN.x, SUN.y];

const polar = (angle: number, radius: number): [number, number] => [SUN.x + Math.cos(angle) * radius, SUN.y + Math.sin(angle) * radius];

export function SunGlow() {
  return (
    <>
      <Defs>
        <RadialGradient id="glow">
          <Stop offset="0" stopColor="#FFE27A" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#FFE27A" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={SUN.x} cy={SUN.y} r={96} fill="url(#glow)" />
    </>
  );
}

export function SunRays({ style, rim = '#F2A33A' }: { style: RayStyle; rim?: string }) {
  if (style === 'lines') {
    return (
      <G stroke={rim} strokeWidth={5} strokeLinecap="round">
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i * 2 * Math.PI) / 14;
          const [x1, y1] = polar(a, 54);
          const [x2, y2] = polar(a, i % 2 ? 70 : 78);
          return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </G>
    );
  }
  if (style === 'tri') {
    return (
      <G fill={rim} stroke={rim} strokeWidth={3} strokeLinejoin="round" opacity={0.92}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 2 * Math.PI) / 12;
          const [x1, y1] = polar(a - 0.17, 52);
          const [x2, y2] = polar(a, 76);
          const [x3, y3] = polar(a + 0.17, 52);
          return <Path key={i} d={`M${x1} ${y1} L${x2} ${y2} L${x3} ${y3}`} />;
        })}
      </G>
    );
  }
  return (
    <G fill={rim}>
      {Array.from({ length: 16 }, (_, i) => {
        const [x, y] = polar((i * 2 * Math.PI) / 16, 64);
        return <Circle key={i} cx={x} cy={y} r={i % 2 ? 3 : 5} />;
      })}
    </G>
  );
}

export function SunBody({ face, body = '#FFCF45', rim = '#F2A33A' }: { face: SunFace; body?: string; rim?: string }) {
  const cx = SUN.x;
  const cy = SUN.y;
  const eyeY = cy - 5;
  const dots = (
    <>
      <Circle cx={cx - 14} cy={eyeY} r={3.6} fill={INK} />
      <Circle cx={cx + 14} cy={eyeY} r={3.6} fill={INK} />
    </>
  );
  const smile = (
    <Path d={`M${cx - 15} ${cy + 8} Q${cx} ${cy + 22} ${cx + 15} ${cy + 8}`} stroke={INK} strokeWidth={3.4} fill="none" strokeLinecap="round" />
  );
  const cheeks = (
    <>
      <Circle cx={cx - 22} cy={cy + 7} r={5.5} fill="#FF9C9C" opacity={0.7} />
      <Circle cx={cx + 22} cy={cy + 7} r={5.5} fill="#FF9C9C" opacity={0.7} />
    </>
  );
  const faces: Record<SunFace, React.ReactNode> = {
    smile: (
      <>
        {dots}
        {smile}
        {cheeks}
      </>
    ),
    wink: (
      <>
        <Path d={`M${cx - 20} ${eyeY + 2} Q${cx - 14} ${eyeY - 5} ${cx - 8} ${eyeY + 2}`} stroke={INK} strokeWidth={3.2} fill="none" strokeLinecap="round" />
        <Circle cx={cx + 14} cy={eyeY} r={3.6} fill={INK} />
        {smile}
        {cheeks}
      </>
    ),
    sleepy: (
      <>
        <Path
          d={`M${cx - 20} ${eyeY} Q${cx - 14} ${eyeY + 6} ${cx - 8} ${eyeY} M${cx + 8} ${eyeY} Q${cx + 14} ${eyeY + 6} ${cx + 20} ${eyeY}`}
          stroke={INK}
          strokeWidth={3.2}
          fill="none"
          strokeLinecap="round"
        />
        <Ellipse cx={cx} cy={cy + 14} rx={5} ry={6.5} fill="#7A3B12" />
        {cheeks}
        <SvgText x={cx + 34} y={cy - 38} fontSize={16} fontWeight="700" fill={rim}>
          z
        </SvgText>
      </>
    ),
    happy: (
      <>
        <Path
          d={`M${cx - 20} ${eyeY + 3} Q${cx - 14} ${eyeY - 5} ${cx - 8} ${eyeY + 3} M${cx + 8} ${eyeY + 3} Q${cx + 14} ${eyeY - 5} ${cx + 20} ${eyeY + 3}`}
          stroke={INK}
          strokeWidth={3.2}
          fill="none"
          strokeLinecap="round"
        />
        <Path d={`M${cx - 16} ${cy + 6} Q${cx} ${cy + 30} ${cx + 16} ${cy + 6} Z`} fill="#7A3B12" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        {cheeks}
      </>
    ),
    open: (
      <>
        {dots}
        <Ellipse cx={cx} cy={cy + 14} rx={9} ry={8} fill="#7A3B12" />
        <Ellipse cx={cx} cy={cy + 18} rx={5} ry={3} fill="#FF7B7B" />
        {cheeks}
      </>
    ),
    shades: (
      <>
        <Rect x={cx - 26} y={cy - 12} width={24} height={15} rx={6} fill="#2A1F1C" />
        <Rect x={cx + 2} y={cy - 12} width={24} height={15} rx={6} fill="#2A1F1C" />
        <Path d={`M${cx - 2} ${cy - 6} H${cx + 2}`} stroke="#2A1F1C" strokeWidth={3} />
        <Path d={`M${cx - 20} ${cy - 8} l5 -1 M${cx + 8} ${cy - 8} l5 -1`} stroke="#fff" strokeWidth={2} opacity={0.6} strokeLinecap="round" />
        {smile}
      </>
    ),
  };
  return (
    <>
      <Circle cx={cx} cy={cy} r={44} fill={body} stroke={rim} strokeWidth={4} />
      {faces[face]}
    </>
  );
}

// ---------------------------------------------------------------- moon (centre 278,86)
export function Moon({ kind }: { kind: MoonKind }) {
  const glow = <Circle cx={280} cy={86} r={48} fill="#FFF3B0" opacity={0.12} />;
  if (kind === 'full') {
    return (
      <>
        {glow}
        <Circle cx={280} cy={86} r={34} fill="#FFF0A8" stroke="#F3D96B" strokeWidth={3} />
        <Circle cx={268} cy={76} r={6} fill="#F0DC85" opacity={0.75} />
        <Circle cx={291} cy={94} r={8} fill="#F0DC85" opacity={0.75} />
        <Circle cx={283} cy={70} r={3.5} fill="#F0DC85" opacity={0.75} />
      </>
    );
  }
  if (kind === 'half') {
    return (
      <>
        {glow}
        <Circle cx={280} cy={86} r={34} fill="#FFF0A8" opacity={0.14} />
        <Path d="M280 52 A34 34 0 0 1 280 120 Z" fill="#FFF0A8" stroke="#F3D96B" strokeWidth={3} strokeLinejoin="round" />
      </>
    );
  }
  return (
    <>
      {glow}
      <Defs>
        <Mask id="crescent">
          <Rect x={230} y={30} width={100} height={110} fill="#000" />
          <Circle cx={278} cy={86} r={32} fill="#fff" />
          <Circle cx={292} cy={76} r={27} fill="#000" />
        </Mask>
      </Defs>
      <G mask="url(#crescent)">
        <Circle cx={278} cy={86} r={32} fill="#FFF0A8" stroke="#F3D96B" strokeWidth={3} />
      </G>
      {kind === 'face' && (
        <>
          <Path d="M259 88 Q263 93 267 88" stroke="#8A6A1E" strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <Path d="M259 100 Q264 105 269 100" stroke="#8A6A1E" strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <Circle cx={257} cy={96} r={3.6} fill="#FF9C9C" opacity={0.6} />
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- stars (deterministic so a look never reshuffles)
export function Stars({ part, parts = 3 }: { part: number; parts?: number }) {
  const rnd = seeded(7);
  const stars = Array.from({ length: 27 }, () => ({ x: rnd() * 340, y: rnd() * 180, size: 6 + rnd() * 11 }));
  return (
    <>
      {stars
        .filter((_, i) => i % parts === part)
        .map((s, i) => (
          <Path
            key={i}
            transform={`translate(${s.x} ${s.y}) scale(${s.size / 20})`}
            d="M10 1 L12 8 L19 10 L12 12 L10 19 L8 12 L1 10 L8 8 Z"
            fill="#FFF3B0"
          />
        ))}
    </>
  );
}

// ---------------------------------------------------------------- clouds
export function CloudShape({ x, y, width, fill, stroke }: { x: number; y: number; width: number; fill: string; stroke: string }) {
  return (
    <Path
      transform={`translate(${x} ${y}) scale(${width / 120})`}
      d="M18 46 C4 46 2 28 18 27 C18 12 40 8 48 20 C56 6 84 8 86 26 C106 22 116 44 98 46 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={3}
      strokeLinejoin="round"
    />
  );
}

// ---------------------------------------------------------------- ground
export function Ground({ kind, time, pal }: { kind: GroundKind; time: TimeOfDay; pal: 0 | 1 }) {
  const g = GROUND[time];
  if (kind === 'hills') {
    const [f2, f1, s2, s1] = g.hills[pal];
    return (
      <>
        <Path d="M-10 214 Q80 178 170 202 T370 192 V310 H-10 Z" fill={f2} stroke={s2} strokeWidth={3} />
        <Path d="M-10 246 Q100 214 200 238 T370 230 V310 H-10 Z" fill={f1} stroke={s1} strokeWidth={3} />
      </>
    );
  }
  if (kind === 'mountains') {
    const [a, b] = g.mountain;
    const [, f1, , s1] = g.hills[pal];
    const snow = time === 'night' ? '#B9C4E6' : '#fff';
    return (
      <>
        <Path d="M-10 218 L40 150 L84 200 L134 130 L196 206 L248 152 L304 208 L370 160 V310 H-10 Z" fill={a} stroke={b} strokeWidth={3} strokeLinejoin="round" />
        <Path
          d="M134 130 L120 150 L130 146 L136 154 L144 146 L150 152 Z M40 150 L30 164 L38 160 L44 166 L50 158 Z M248 152 L238 166 L246 162 L252 168 L260 160 Z"
          fill={snow}
          opacity={0.9}
        />
        <Path d="M-10 238 Q90 212 190 232 T370 226 V310 H-10 Z" fill={f1} stroke={s1} strokeWidth={3} />
      </>
    );
  }
  if (kind === 'sea') {
    const [a, b] = g.sea;
    return (
      <>
        <Defs>
          <LinearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={a} />
            <Stop offset="1" stopColor={b} />
          </LinearGradient>
        </Defs>
        <Rect x={-10} y={190} width={380} height={125} fill="url(#sea)" />
        <Path d={`M0 204 ${'q10 -5 20 0 t20 0 '.repeat(9)}`} stroke="#fff" strokeOpacity={0.35} strokeWidth={2} fill="none" />
        <Path d="M-10 250 Q60 234 120 250 T250 250 T370 244 V310 H-10 Z" fill={b} stroke={a} strokeWidth={3} opacity={0.95} />
      </>
    );
  }
  if (kind === 'dunes') {
    const [a, b] = g.sand;
    const cactus = time === 'night' ? '#25405A' : '#6FA66A';
    const cactusLine = time === 'night' ? '#1B3045' : '#4F8450';
    return (
      <>
        <Path d="M-10 210 Q70 176 150 202 T290 192 T370 200 V310 H-10 Z" fill={a} stroke={b} strokeWidth={3} />
        <Path d="M-10 240 Q110 208 220 234 T370 226 V310 H-10 Z" fill={b} stroke={a} strokeWidth={3} />
        <Rect x={318} y={176} width={9} height={36} rx={4.5} fill={cactus} stroke={cactusLine} strokeWidth={2.4} />
        <Path d="M318 191 q-10 0 -10 -12 q0 -4 4 -4 q4 0 4 4 v8 M327 186 q10 0 10 -10 q0 -4 -4 -4 q-4 0 -4 4 v6" fill="none" stroke={cactusLine} strokeWidth={2.4} />
      </>
    );
  }
  // city skyline
  const rnd = seeded(11);
  const lit = time === 'sunset' || time === 'night';
  const buildings: React.ReactNode[] = [];
  for (let x = -6; x < 366; x += 26) {
    const w = 20 + rnd() * 10;
    const h = 24 + rnd() * 44;
    const y = 222 - h;
    buildings.push(<Rect key={`b${x}`} x={x} y={y} width={w} height={h + 30} fill={g.city} />);
    if (lit) {
      for (let wy = y + 6; wy < 218; wy += 11) {
        for (let wx = x + 4; wx < x + w - 4; wx += 8) {
          if (rnd() > 0.55) buildings.push(<Rect key={`w${x}-${wy}-${wx}`} x={wx} y={wy} width={3.5} height={4.5} fill="#FFD76A" opacity={0.9} />);
        }
      }
    }
  }
  return (
    <>
      {buildings}
      <Rect x={-10} y={222} width={380} height={94} fill={g.city} />
      <Path d="M-10 250 Q100 238 200 250 T370 246 V310 H-10 Z" fill="#000" opacity={0.12} />
    </>
  );
}

/** Sunlight or moonlight glints on the sea (animated separately). */
export function SeaGlints({ time }: { time: TimeOfDay }) {
  const colour = time === 'night' ? '#FFF3B0' : '#FFF1C2';
  const x = time === 'night' ? 280 : SUN.x;
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <Rect key={i} x={x - (32 - i * 7) / 2} y={200 + i * 9} width={32 - i * 7} height={3.5} rx={2} fill={colour} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- extras (static art; motion is added in scene.tsx)
export function BirdsArt({ color }: { color: string }) {
  return (
    <G transform="translate(0 150)">
      {[0, 24, 50].map((x, i) => (
        <Path key={x} d={`M${x} ${i * 7} q6 -8 12 0 q6 -8 12 0`} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      ))}
    </G>
  );
}

export function BalloonArt() {
  return (
    <G transform="translate(46 142) scale(0.8)">
      <Path d="M22 0 C44 0 46 28 30 44 L14 44 C-2 28 0 0 22 0Z" fill="#FF7A8A" stroke="#C84A5C" strokeWidth={2.5} />
      <Path d="M22 0 C30 10 30 34 22 44 M22 0 C14 10 14 34 22 44" stroke="#FFE08A" strokeWidth={3} fill="none" />
      <Path d="M14 44 L16 56 M30 44 L28 56" stroke="#8A5A3C" strokeWidth={2} />
      <Rect x={14} y={56} width={16} height={10} rx={2} fill="#C98B52" stroke="#8A5A3C" strokeWidth={2} />
    </G>
  );
}

export function KiteArt() {
  return (
    <G transform="translate(86 150)">
      <Path d="M0 22 Q-10 52 -28 58" stroke="#8A7A6A" strokeWidth={1.6} fill="none" />
      <Path d="M0 -22 L15 0 L0 24 L-15 0Z" fill="#FF8FB0" stroke="#D9567B" strokeWidth={2.5} strokeLinejoin="round" />
      <Path d="M0 -22 V24 M-15 0 H15" stroke="#D9567B" strokeWidth={1.8} />
      <Path d="M0 24 q6 6 0 12 q-6 6 0 12" stroke="#FFC24A" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </G>
  );
}

export function ButterflyArt({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Ellipse cx={-6} cy={0} rx={7} ry={5} fill={color} stroke="#8A4A60" strokeWidth={1.6} />
      <Ellipse cx={6} cy={0} rx={7} ry={5} fill={color} stroke="#8A4A60" strokeWidth={1.6} />
      <Path d="M0 -4 V6" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </G>
  );
}

export function FlowersArt() {
  const colors = ['#FF8FB0', '#FFC24A', '#FF7A8A', '#FFFFFF', '#B79CFF'];
  return (
    <>
      {[24, 50, 78, 106, 134].map((x, i) => (
        <G key={x}>
          <Path d={`M${x} 214 V${196 + (i % 2) * 3}`} stroke="#5C9E54" strokeWidth={2.6} />
          <Path d={`M${x - 5} ${194 + (i % 2) * 3} q5 -12 5 -12 q0 0 5 12 q-5 5 -10 0Z`} fill={colors[i]} stroke="#B8506E" strokeWidth={1.6} />
        </G>
      ))}
    </>
  );
}

export function WindmillTower() {
  return <Path d="M62 220 L78 220 L74 172 L66 172Z" fill="#fff" stroke="#9AA6B2" strokeWidth={2.4} />;
}
export function WindmillBlades() {
  return (
    <G transform="translate(70 172)">
      {[0, 90, 180, 270].map((a) => (
        <Rect key={a} x={-3} y={-34} width={6} height={30} rx={2} fill="#F5E6C8" stroke="#B08A55" strokeWidth={2} transform={`rotate(${a})`} />
      ))}
      <Circle r={3.6} fill="#B08A55" />
    </G>
  );
}

export function HouseArt() {
  return (
    <G transform="translate(40 168)">
      <Rect x={6} y={22} width={40} height={30} fill="#FFE9D2" stroke="#C98B52" strokeWidth={2.6} />
      <Path d="M0 24 L26 2 L52 24Z" fill="#E86F5A" stroke="#B44B3A" strokeWidth={2.6} strokeLinejoin="round" />
      <Rect x={21} y={34} width={10} height={18} fill="#9A6A44" />
      <Rect x={10} y={28} width={8} height={8} fill="#9FD3F2" stroke="#C98B52" strokeWidth={1.6} />
      <Rect x={38} y={6} width={6} height={12} fill="#B44B3A" />
    </G>
  );
}
export function SmokePuff({ dy = 0 }: { dy?: number }) {
  return <Circle cx={81} cy={172 + dy} r={3.6} fill="#fff" opacity={0.85} />;
}

export function TreesArt() {
  return (
    <>
      {[
        [34, 0],
        [96, 10],
      ].map(([x, o]) => (
        <G key={x}>
          <Rect x={x - 3} y={176 + o} width={6} height={40} fill="#9A6A44" />
          <Circle cx={x} cy={168 + o} r={17} fill="#7FBF6E" stroke="#5E9A52" strokeWidth={2.6} />
          <Circle cx={x - 7} cy={172 + o} r={8} fill="#92CE7E" opacity={0.7} />
        </G>
      ))}
    </>
  );
}

export function PlaneArt() {
  return (
    <G transform="translate(0 168)">
      <Path d="M-40 6 H-4" stroke="#fff" strokeWidth={3} strokeDasharray="6 5" strokeLinecap="round" opacity={0.8} />
      <Path d="M0 0 L28 -9 L10 9 Z M10 9 L12 -2" fill="#fff" stroke="#8D9BAD" strokeWidth={2} strokeLinejoin="round" />
    </G>
  );
}

export function RainbowArt() {
  return (
    <>
      {(
        [
          ['#FF8A80', 74],
          ['#FFD27A', 66],
          ['#9ADBA0', 58],
          ['#8FC9F5', 50],
        ] as const
      ).map(([c, r]) => (
        <Path key={c} d={`M${90 - r} 222 A${r} ${r} 0 0 1 ${90 + r} 222`} fill="none" stroke={c} strokeWidth={7} opacity={0.75} />
      ))}
    </>
  );
}

export function SailboatArt() {
  return (
    <G transform="translate(46 190)">
      <Path d="M0 14 H44 L38 24 H6Z" fill="#fff" stroke="#8D9BAD" strokeWidth={2.4} strokeLinejoin="round" />
      <Path d="M22 14 V-20" stroke="#8A6A4A" strokeWidth={2.6} />
      <Path d="M24 -18 L24 10 L44 10Z" fill="#FF8A80" stroke="#C85A52" strokeWidth={2.2} strokeLinejoin="round" />
      <Path d="M20 -14 L20 10 L4 10Z" fill="#fff" stroke="#8D9BAD" strokeWidth={2.2} strokeLinejoin="round" />
    </G>
  );
}

export function PalmArt() {
  return (
    <G transform="translate(300 214)" stroke="#2F2A44">
      <Path d="M0 0 Q6 -30 -2 -60" fill="none" strokeWidth={5} strokeLinecap="round" />
      <G transform="translate(-2 -60)" fill="none" strokeWidth={4} strokeLinecap="round">
        <Path d="M0 0 q-22 -6 -30 10 M0 0 q-14 -16 -34 -10 M0 0 q10 -20 30 -12 M0 0 q22 -4 28 12" />
      </G>
    </G>
  );
}

export function LanternArt() {
  return (
    <G transform="translate(150 152)">
      <Circle r={22} fill="#FFD76A" opacity={0.25} />
      <Path d="M-8 -10 H8 L10 10 H-10Z" fill="#FFB347" stroke="#E0832A" strokeWidth={2.2} strokeLinejoin="round" />
      <Path d="M-4 10 Q0 18 4 10" fill="#FF7A3C" />
    </G>
  );
}

export function OwlArt() {
  return (
    <G transform="translate(46 160)">
      <Path d="M-30 52 Q20 46 70 50" stroke="#6B5438" strokeWidth={5} fill="none" strokeLinecap="round" />
      <Ellipse cx={22} cy={30} rx={14} ry={18} fill="#9A7A56" stroke="#6B5438" strokeWidth={2.6} />
      <Path d="M10 14 l-3 -10 l9 5 M34 14 l3 -10 l-9 5" fill="#9A7A56" stroke="#6B5438" strokeWidth={2.2} strokeLinejoin="round" />
      <Ellipse cx={22} cy={38} rx={8} ry={10} fill="#E8D3A8" />
      <Circle cx={16} cy={26} r={5.4} fill="#fff" />
      <Circle cx={28} cy={26} r={5.4} fill="#fff" />
      <Circle cx={16} cy={27} r={2.4} fill="#2A1F1C" />
      <Circle cx={28} cy={27} r={2.4} fill="#2A1F1C" />
      <Path d="M22 30 l-2.4 4 h4.8Z" fill="#F2A33A" />
    </G>
  );
}

export function ShootArt() {
  return (
    <G transform="translate(336 36)">
      <Path d="M0 0 L34 -19" stroke="#fff" strokeOpacity={0.7} strokeWidth={3} strokeLinecap="round" />
      <Circle r={3} fill="#fff" />
    </G>
  );
}

export function FirefliesArt({ half }: { half: 0 | 1 }) {
  const all = [
    [40, 190],
    [70, 172],
    [102, 196],
    [138, 178],
    [170, 200],
    [30, 160],
    [120, 150],
    [190, 182],
  ];
  return (
    <>
      {all
        .filter((_, i) => i % 2 === half)
        .map(([x, y]) => (
          <G key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <Circle r={7} fill="#FFF3A0" opacity={0.18} />
            <Circle r={3.2} fill="#FFF3A0" />
          </G>
        ))}
    </>
  );
}

export function PlanetArt() {
  return (
    <G transform="translate(110 156)">
      <Circle r={15} fill="#E8B8E0" stroke="#B885B0" strokeWidth={2.6} />
      <Ellipse rx={26} ry={7} fill="none" stroke="#FFE08A" strokeWidth={3.2} transform="rotate(-18)" />
    </G>
  );
}

export function AuroraArt() {
  return (
    <>
      <Defs>
        <LinearGradient id="aur1" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6BFFB0" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#6BFFB0" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="aur2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF8FD0" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#FF8FD0" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d="M-10 96 Q60 40 130 84 T260 70 T370 90 V130 Q290 112 220 124 T90 118 T-10 134Z" fill="url(#aur1)" />
      <Path d="M-10 120 Q80 74 150 108 T300 96 T370 112 V146 Q300 130 230 142 T100 140 T-10 152Z" fill="url(#aur2)" />
    </>
  );
}

// ---------------------------------------------------------------- weather
export function RainLines({ part, parts = 3, storm }: { part: number; parts?: number; storm: boolean }) {
  const count = storm ? 54 : 38;
  return (
    <>
      {Array.from({ length: count }, (_, i) => i)
        .filter((i) => i % parts === part)
        .map((i) => {
          const x = (i * 37) % 380;
          return <Line key={i} x1={x} y1={0} x2={x - 4} y2={12} stroke="#CFE6FA" strokeWidth={2} strokeLinecap="round" opacity={0.75} />;
        })}
    </>
  );
}

export function SnowFlakes({ part, parts = 3 }: { part: number; parts?: number }) {
  return (
    <>
      {Array.from({ length: 45 }, (_, i) => i)
        .filter((i) => i % parts === part)
        .map((i) => (
          <Circle key={i} cx={(i * 53) % 360} cy={0} r={1.6 + (i % 3) * 0.7} fill="#fff" />
        ))}
    </>
  );
}

export function FogBand({ y }: { y: number }) {
  return <Rect x={-40} y={y} width={440} height={34} rx={17} fill="#fff" opacity={0.4} />;
}

export function LightningBolt() {
  return (
    <>
      <Rect width={SCENE_W} height={SCENE_H} fill="#fff" opacity={0.35} />
      <Path d="M190 36 L172 92 L190 92 L178 140 L216 78 L196 78 L208 36Z" fill="#FFF3A0" stroke="#F2C94C" strokeWidth={2.4} strokeLinejoin="round" />
    </>
  );
}

export function Tone({ color }: { color: string }) {
  return <Rect width={SCENE_W} height={SCENE_H} fill={color} />;
}
