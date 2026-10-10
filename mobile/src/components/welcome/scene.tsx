import { View } from 'react-native';

import type { TimeOfDay } from '@/content/quotes';
import { Motion, SceneMetricsContext, SvgLayer, type Loop } from '@/components/welcome/motion';
import {
  AuroraArt,
  BalloonArt,
  BirdsArt,
  ButterflyArt,
  CloudShape,
  FirefliesArt,
  FlowersArt,
  FogBand,
  Ground,
  HouseArt,
  KiteArt,
  LanternArt,
  LightningBolt,
  Moon,
  OwlArt,
  PalmArt,
  PlaneArt,
  PlanetArt,
  RainLines,
  RainbowArt,
  SailboatArt,
  SeaGlints,
  ShootArt,
  Sky,
  SmokePuff,
  SnowFlakes,
  Stars,
  SUN_CENTER,
  SunBody,
  SunGlow,
  SunRays,
  Tone,
  TreesArt,
  WindmillBlades,
  WindmillTower,
} from '@/components/welcome/scene-parts';
import { LOOKS, SCENE_H, SCENE_W, type ExtraKind, type Look, type MoonKind } from '@/components/welcome/scene-data';
import type { WeatherKind } from '@/data/weather';

const bob = (amplitude: number, duration = 2000, delay = 0): Loop => ({ from: 0, to: -amplitude, duration, delay, yoyo: true, ease: 'inOut' });

function Extra({ kind, time }: { kind: ExtraKind; time: TimeOfDay }) {
  const birds = time === 'sunset' ? '#4A3B5C' : time === 'night' ? '#C9CCE8' : '#3B3B4F';
  switch (kind) {
    case 'birds':
      return (
        <Motion x={{ from: -90, to: 450, duration: 18000 }}>
          <SvgLayer>
            <BirdsArt color={birds} />
          </SvgLayer>
        </Motion>
      );
    case 'balloon':
      return (
        <Motion y={bob(7)}>
          <SvgLayer>
            <BalloonArt />
          </SvgLayer>
        </Motion>
      );
    case 'kite':
      return (
        <Motion rotate={{ from: -6, to: 6, duration: 1800, yoyo: true, ease: 'inOut' }} origin={[86, 190]}>
          <SvgLayer>
            <KiteArt />
          </SvgLayer>
        </Motion>
      );
    case 'butterflies':
      return (
        <>
          {(
            [
              [64, 172, '#FF9CC2'],
              [118, 184, '#FFC24A'],
            ] as const
          ).map(([x, y, c], i) => (
            <Motion key={x} y={bob(7, 1800, i * 500)} scaleX={{ from: 1, to: 0.4, duration: 260, yoyo: true }} origin={[x, y]}>
              <SvgLayer>
                <ButterflyArt x={x} y={y} color={c} />
              </SvgLayer>
            </Motion>
          ))}
        </>
      );
    case 'flowers':
      return (
        <SvgLayer>
          <FlowersArt />
        </SvgLayer>
      );
    case 'windmill':
      return (
        <>
          <SvgLayer>
            <WindmillTower />
          </SvgLayer>
          <Motion rotate={{ from: 0, to: 360, duration: 6000 }} origin={[70, 172]}>
            <SvgLayer>
              <WindmillBlades />
            </SvgLayer>
          </Motion>
        </>
      );
    case 'house':
      return (
        <>
          <SvgLayer>
            <HouseArt />
          </SvgLayer>
          {[0, 1].map((i) => (
            <Motion
              key={i}
              y={{ from: 0, to: -24, duration: 3200, delay: i * 1600 }}
              opacity={{ from: 0.85, to: 0, duration: 3200, delay: i * 1600 }}>
              <SvgLayer>
                <SmokePuff dy={i * 3} />
              </SvgLayer>
            </Motion>
          ))}
        </>
      );
    case 'trees':
      return (
        <SvgLayer>
          <TreesArt />
        </SvgLayer>
      );
    case 'plane':
      return (
        <Motion x={{ from: -60, to: 440, duration: 30000, delay: 2000 }}>
          <SvgLayer>
            <PlaneArt />
          </SvgLayer>
        </Motion>
      );
    case 'rainbow':
      return (
        <SvgLayer>
          <RainbowArt />
        </SvgLayer>
      );
    case 'sailboat':
      return (
        <Motion y={bob(4, 2400)}>
          <SvgLayer>
            <SailboatArt />
          </SvgLayer>
        </Motion>
      );
    case 'palm':
      return (
        <SvgLayer>
          <PalmArt />
        </SvgLayer>
      );
    case 'lantern':
      return (
        <Motion y={bob(26, 4500)}>
          <SvgLayer>
            <LanternArt />
          </SvgLayer>
        </Motion>
      );
    case 'owl':
      return (
        <SvgLayer>
          <OwlArt />
        </SvgLayer>
      );
    case 'shoot': {
      const run = { duration: 1600, gap: 6000, rest: 0 };
      return (
        <Motion
          x={{ from: 0, to: -170, ...run }}
          y={{ from: 0, to: 95, ...run }}
          opacity={{ from: 1, to: 0, ...run }}>
          <SvgLayer>
            <ShootArt />
          </SvgLayer>
        </Motion>
      );
    }
    case 'fireflies':
      return (
        <>
          {([0, 1] as const).map((half) => (
            <Motion
              key={half}
              y={bob(9, 2200 + half * 700, half * 500)}
              opacity={{ from: 0.3, to: 1, duration: 1400 + half * 500, yoyo: true, ease: 'inOut' }}>
              <SvgLayer>
                <FirefliesArt half={half} />
              </SvgLayer>
            </Motion>
          ))}
        </>
      );
    case 'planet':
      return (
        <Motion y={bob(5, 3200)}>
          <SvgLayer>
            <PlanetArt />
          </SvgLayer>
        </Motion>
      );
    case 'aurora':
      return (
        <Motion opacity={{ from: 0.45, to: 0.9, duration: 3200, yoyo: true, ease: 'inOut' }}>
          <SvgLayer>
            <AuroraArt />
          </SvgLayer>
        </Motion>
      );
  }
}

const SUN_VISIBILITY: Record<WeatherKind, number> = { clear: 1, partly: 1, cloudy: 0.45, rain: 0.12, storm: 0.12, snow: 0.3, fog: 0.5 };

function SunGroup({ time, look, weather }: { time: TimeOfDay; look: Look; weather: WeatherKind }) {
  const y: Loop =
    time === 'morning'
      ? { from: 200, to: -22, duration: 3400, repeat: 2, ease: 'out', restAt: 'to' } // rises twice, then rests
      : time === 'sunset'
        ? { from: -22, to: 34, duration: 3600, repeat: 2, ease: 'inOut', restAt: 'to' } // sinks twice, then rests low
        : { from: -44, to: -44, duration: 1, repeat: 1, restAt: 'to' }; // afternoon: high in the sky
  const afternoon = time === 'afternoon';
  return (
    <Motion y={y} opacity={SUN_VISIBILITY[weather]}>
      <Motion
        opacity={afternoon ? { from: 0.45, to: 0.9, duration: 2600, yoyo: true, ease: 'inOut' } : 0.6}
        scale={afternoon ? { from: 1, to: 1.12, duration: 2600, yoyo: true, ease: 'inOut' } : undefined}
        origin={SUN_CENTER}>
        <SvgLayer>
          <SunGlow />
        </SvgLayer>
      </Motion>
      <Motion rotate={{ from: 0, to: 360, duration: afternoon ? 30000 : 60000 }} origin={SUN_CENTER}>
        <SvgLayer>
          <SunRays style={look.rays ?? 'lines'} />
        </SvgLayer>
      </Motion>
      <SvgLayer>
        <SunBody face={look.face as Exclude<Look['face'], MoonKind>} />
      </SvgLayer>
    </Motion>
  );
}

function DayClouds({ time }: { time: TimeOfDay }) {
  const fill = time === 'sunset' ? '#FFE9DC' : '#FFFFFF';
  const stroke = time === 'sunset' ? '#F2C4B0' : '#C9D8E4';
  return (
    <>
      <Motion x={{ from: -120, to: 420, duration: 28000 }}>
        <SvgLayer>
          <CloudShape x={0} y={46} width={96} fill={fill} stroke={stroke} />
        </SvgLayer>
      </Motion>
      <Motion x={{ from: -120, to: 420, duration: 40000, delay: 9000 }}>
        <SvgLayer>
          <CloudShape x={0} y={116} width={70} fill={fill} stroke={stroke} />
        </SvgLayer>
      </Motion>
    </>
  );
}

const hover = (delay = 0): Loop => ({ from: -14, to: 14, duration: 10000, delay, yoyo: true, ease: 'inOut' });

function WeatherLayers({ weather }: { weather: WeatherKind }) {
  if (weather === 'clear') return null;
  const tones: Partial<Record<WeatherKind, string>> = {
    cloudy: 'rgba(120,130,145,0.18)',
    rain: 'rgba(70,85,110,0.32)',
    storm: 'rgba(35,45,75,0.5)',
    snow: 'rgba(235,242,250,0.28)',
    fog: 'rgba(240,240,240,0.4)',
  };
  const tone = tones[weather];
  const cloud = (x: number, y: number, w: number, fill: string, stroke: string, i: number) => (
    <Motion key={`${x}-${y}`} x={hover(i * 1500)}>
      <SvgLayer>
        <CloudShape x={x} y={y} width={w} fill={fill} stroke={stroke} />
      </SvgLayer>
    </Motion>
  );
  const dark = weather === 'storm' ? ['#59627A', '#444C62'] : ['#8C97A8', '#6F7B8E'];
  return (
    <>
      {tone && (
        <SvgLayer>
          <Tone color={tone} />
        </SvgLayer>
      )}
      {weather === 'partly' && [cloud(196, 92, 150, '#FFFFFF', '#C9D8E4', 0), cloud(268, 150, 96, '#FFFFFF', '#C9D8E4', 1)]}
      {weather === 'cloudy' &&
        [cloud(-8, 20, 130, '#D3DAE3', '#AEB9C7', 0), cloud(80, 52, 150, '#E1E6ED', '#B9C3D0', 1), cloud(190, 14, 150, '#D3DAE3', '#AEB9C7', 2), cloud(250, 70, 120, '#E1E6ED', '#B9C3D0', 3)]}
      {(weather === 'rain' || weather === 'storm') && (
        <>
          {[cloud(-14, 8, 140, dark[0], dark[1], 0), cloud(70, 40, 160, dark[0], dark[1], 1), cloud(190, 2, 150, dark[0], dark[1], 2), cloud(250, 52, 130, dark[0], dark[1], 3)]}
          {[0, 1, 2].map((p) => (
            <Motion
              key={p}
              y={{ from: -30, to: SCENE_H + 30, duration: 900 + p * 120, delay: p * 300 }}
              x={{ from: 0, to: -16, duration: 900 + p * 120, delay: p * 300 }}>
              <SvgLayer>
                <RainLines part={p} storm={weather === 'storm'} />
              </SvgLayer>
            </Motion>
          ))}
        </>
      )}
      {weather === 'storm' && (
        <Motion opacity={{ from: 0.9, to: 0, duration: 260, gap: 5200, rest: 0 }}>
          <SvgLayer>
            <LightningBolt />
          </SvgLayer>
        </Motion>
      )}
      {weather === 'snow' && (
        <>
          {[cloud(-8, 14, 140, '#F4F8FC', '#CAD7E4', 0), cloud(100, 44, 150, '#FFFFFF', '#CAD7E4', 1), cloud(220, 10, 140, '#F4F8FC', '#CAD7E4', 2)]}
          {[0, 1, 2].map((p) => (
            <Motion
              key={p}
              y={{ from: -20, to: SCENE_H + 20, duration: 5000 + p * 1300, delay: p * 900 }}
              x={{ from: 0, to: 14, duration: 5000 + p * 1300, delay: p * 900 }}>
              <SvgLayer>
                <SnowFlakes part={p} />
              </SvgLayer>
            </Motion>
          ))}
        </>
      )}
      {weather === 'fog' &&
        [100, 150, 196].map((y, i) => (
          <Motion key={y} x={{ from: -40, to: 40, duration: 16000, delay: i * 2000, yoyo: true, ease: 'inOut' }}>
            <SvgLayer>
              <FogBand y={y} />
            </SvgLayer>
          </Motion>
        ))}
    </>
  );
}

type SceneProps = { time: TimeOfDay; lookIndex: number; weather: WeatherKind | null; width: number; height: number };

/** One welcome-banner scene: sky, sun or moon, clouds, little extras, ground, then weather on top. */
export function Scene({ time, lookIndex, weather, width, height }: SceneProps) {
  const look = LOOKS[time][lookIndex % LOOKS[time].length];
  const night = time === 'night';
  const w: WeatherKind = weather ?? 'clear';
  const k = Math.max(width / SCENE_W, height / SCENE_H);
  const metrics = { k, xOff: (SCENE_W * k - width) / 2, yOff: (SCENE_H * k - height) / 2 };

  return (
    <View style={{ width, height, overflow: 'hidden' }} pointerEvents="none">
      <SceneMetricsContext.Provider value={metrics}>
        <SvgLayer>
          <Sky colors={look.sky} />
        </SvgLayer>
        {night ? (
          <>
            {[0, 1, 2].map((p) => (
              <Motion key={p} opacity={{ from: 0.3, to: 1, duration: 1800 + p * 700, delay: p * 400, yoyo: true, ease: 'inOut' }}>
                <SvgLayer>
                  <Stars part={p} />
                </SvgLayer>
              </Motion>
            ))}
            <Motion y={bob(5, 3000)} opacity={SUN_VISIBILITY[w] > 0.5 ? 1 : 0.5}>
              <SvgLayer>
                <Moon kind={look.face as MoonKind} />
              </SvgLayer>
            </Motion>
          </>
        ) : (
          <>
            <SunGroup time={time} look={look} weather={w} />
            <DayClouds time={time} />
          </>
        )}
        {look.extras.map((kind) => (
          <Extra key={kind} kind={kind} time={time} />
        ))}
        <SvgLayer>
          <Ground kind={look.ground} time={time} pal={look.pal} />
        </SvgLayer>
        {look.ground === 'sea' && (
          <Motion opacity={{ from: 0.25, to: 0.85, duration: 1300, yoyo: true, ease: 'inOut' }}>
            <SvgLayer>
              <SeaGlints time={time} />
            </SvgLayer>
          </Motion>
        )}
        <WeatherLayers weather={w} />
      </SceneMetricsContext.Provider>
    </View>
  );
}
