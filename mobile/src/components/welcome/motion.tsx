import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { SCENE_H, SCENE_W } from '@/components/welcome/scene-data';

/** Scale from scene units (360x300) to screen points, plus the crop from `slice` fitting. */
export type SceneMetrics = { k: number; xOff: number; yOff: number };
export const SceneMetricsContext = createContext<SceneMetrics>({ k: 1, xOff: 0, yOff: 0 });

export type Loop = {
  from: number;
  to: number;
  /** One run, in milliseconds. */
  duration: number;
  delay?: number;
  /** Number of runs; default is forever. */
  repeat?: number;
  /** Go back and forth instead of jumping back to `from`. */
  yoyo?: boolean;
  ease?: 'linear' | 'inOut' | 'out';
  /** Wait this long between runs, holding `rest` (default `from`). */
  gap?: number;
  rest?: number;
  /** With Reduce Motion on, show this end of the loop instead of animating. */
  restAt?: 'from' | 'to';
};

const EASING = {
  linear: Easing.linear,
  inOut: Easing.inOut(Easing.quad),
  out: Easing.out(Easing.cubic),
};

/** One animated number. `neutral` is the value when no loop is given. */
function useLoop(loop: Loop | undefined, neutral: number) {
  const reduced = useReducedMotion();
  const resting = loop ? (loop.restAt === 'to' ? loop.to : loop.from) : neutral;
  const value = useSharedValue(reduced ? resting : loop ? loop.from : neutral);

  const from = loop?.from;
  const to = loop?.to;
  const duration = loop?.duration;
  const delay = loop?.delay;
  const repeat = loop?.repeat;
  const yoyo = loop?.yoyo;
  const ease = loop?.ease;
  const gap = loop?.gap;
  const rest = loop?.rest;

  useEffect(() => {
    if (from === undefined || to === undefined || duration === undefined || reduced) return;
    const easing = EASING[ease ?? 'linear'];
    const run = withTiming(to, { duration, easing });
    const cycle = gap
      ? withSequence(withTiming(rest ?? from, { duration: gap }), withTiming(from, { duration: 0 }), run)
      : run;
    value.value = from;
    value.value = withDelay(delay ?? 0, withRepeat(cycle, repeat ?? -1, yoyo ?? false));
    return () => cancelAnimation(value);
  }, [value, from, to, duration, delay, repeat, yoyo, ease, gap, rest, reduced]);

  return value;
}

type MotionProps = {
  x?: Loop;
  y?: Loop;
  rotate?: Loop;
  scale?: Loop;
  scaleX?: Loop;
  opacity?: Loop | number;
  /** Pivot for rotate and scale, in scene units. */
  origin?: [number, number];
  children: ReactNode;
};

/** Animates everything inside it (layers or nested Motion) on the UI thread. */
export function Motion({ x, y, rotate, scale, scaleX, opacity, origin = [SCENE_W / 2, SCENE_H / 2], children }: MotionProps) {
  const { k, xOff, yOff } = useContext(SceneMetricsContext);
  const tx = useLoop(x, 0);
  const ty = useLoop(y, 0);
  const rot = useLoop(rotate, 0);
  const sc = useLoop(scale, 1);
  const scx = useLoop(scaleX, 1);
  const op = useLoop(typeof opacity === 'object' ? opacity : undefined, typeof opacity === 'number' ? opacity : 1);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [
      { translateX: tx.value * k },
      { translateY: ty.value * k },
      { rotate: `${rot.value}deg` },
      { scale: sc.value },
      { scaleX: scx.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { transformOrigin: [origin[0] * k - xOff, origin[1] * k - yOff, 0] }, style]}>
      {children}
    </Animated.View>
  );
}

/** A transparent full-size drawing surface in scene units. */
export function SvgLayer({ children }: { children: ReactNode }) {
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
      preserveAspectRatio="xMidYMid slice">
      {children}
    </Svg>
  );
}
