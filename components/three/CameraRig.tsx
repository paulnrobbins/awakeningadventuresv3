'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getLenis } from '@/lib/lenis';
import { clamp } from '@/lib/utils';
import { getCameraOverride, SCENE_TARGETS } from '@/lib/cameraOverride';

/**
 * Camera rig — drives the camera position + look-target as a function
 * of global scroll progress, using DOM-measured keyframes.
 *
 * The earlier static-keyframe-table approach was fragile: every change
 * to a section's height (adding the Primitive Camp card, swapping a
 * 140vh scene for a 180vh one) shifted every downstream section's
 * actual scroll position vs. its hard-coded `t` value. Symptoms ranged
 * from "camera arrives at Homestead while you're still on Driftwood"
 * to "Primitive Camp shows Serene Seven view because the keyframe is
 * one card too early."
 *
 * The new approach measures each section's actual top in the document
 * on mount + resize, converts to progress (`top / maxScroll`), and
 * builds the keyframe array from those measurements + the camera
 * positions in `SCENE_TARGETS`. Linear interpolation between adjacent
 * keyframes gives the continuous cinematic-scrub motion that the
 * progress-based system originally provided — but the timing is now
 * DOM-anchored, not progress-window-guessed.
 *
 * Two anticipation offsets are applied: full sections subtract 40% of
 * viewport height so the camera arrives roughly when the section
 * crosses 60% from the top; Stay's sticky-pinned articles subtract
 * 30% (they have less scroll runway each, so a smaller lead works
 * better).
 */

type CameraKeyframe = {
  t: number;
  pos: [number, number, number];
  target: [number, number, number];
};

// Selectors for each section/article in scroll order. The `id` maps
// to a key in SCENE_TARGETS. `kind` controls anticipation: 'section'
// gets larger lead (40% of viewport), 'article' gets smaller (30%).
const SCENE_SELECTORS: { selector: string; id: string; kind: 'section' | 'article' }[] = [
  { selector: 'section[data-scene="sanctuary"]', id: 'property',       kind: 'section' },
  { selector: '[data-accom="stargazer"]',        id: 'stargazer',      kind: 'article' },
  { selector: '[data-accom="driftwood"]',        id: 'driftwood',      kind: 'article' },
  { selector: '[data-accom="homestead"]',        id: 'homestead',      kind: 'article' },
  { selector: '[data-accom="serene-seven"]',     id: 'serene-seven',   kind: 'article' },
  { selector: '[data-accom="primitive-camp"]',   id: 'primitive-camp', kind: 'article' },
  { selector: 'section[data-scene="shower"]',    id: 'shower',         kind: 'section' },
  { selector: 'section[data-scene="trails"]',    id: 'trails',         kind: 'section' },
  { selector: 'section[data-scene="lake"]',      id: 'lake',           kind: 'section' },
  { selector: 'section[data-scene="welcome"]',   id: 'welcome',        kind: 'section' },
  { selector: 'section[data-scene="groups"]',    id: 'groups',         kind: 'section' },
  { selector: 'section[data-scene="book"]',      id: 'book',           kind: 'section' },
];

const DEFAULT_KEYFRAMES: CameraKeyframe[] = [
  { t: 0, ...SCENE_TARGETS.hero },
  { t: 1, ...SCENE_TARGETS.book },
];

function buildKeyframes(): CameraKeyframe[] {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return DEFAULT_KEYFRAMES;
  }

  const docHeight = document.documentElement.scrollHeight;
  const vh = window.innerHeight;
  const maxScroll = docHeight - vh;

  if (maxScroll <= 0) return DEFAULT_KEYFRAMES;

  const frames: CameraKeyframe[] = [];

  // Hero at t=0 — opening aerial. SceneHero's own choreography runs
  // independently; the keyframe is here so that as the visitor begins
  // scrolling, interpolation toward the Property keyframe starts from
  // a known position.
  frames.push({ t: 0, ...SCENE_TARGETS.hero });

  for (const { selector, id, kind } of SCENE_SELECTORS) {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) continue;
    const targetCfg = SCENE_TARGETS[id];
    if (!targetCfg) continue;

    const top = el.getBoundingClientRect().top + window.scrollY;
    // Anticipation: fire the keyframe slightly before the section is
    // fully in view so the camera composes ON the subject as the copy
    // becomes visible, not after.
    const lead = kind === 'section' ? vh * 0.4 : vh * 0.3;
    const t = clamp((top - lead) / maxScroll, 0.001, 0.999);
    frames.push({ t, ...targetCfg });
  }

  // Footer hold — same as Book so the camera doesn't drift after the
  // visitor reaches the bottom.
  frames.push({ t: 1, ...SCENE_TARGETS.book });

  // Sort by t in case any anticipated keyframe ended up out of order.
  frames.sort((a, b) => a.t - b.t);
  return frames;
}

interface CameraRigProps {
  /** Optional handheld shake amount (0..1). Welcome scene uses ~0.3. */
  shake?: number;
}

function linear(t: number) {
  return t;
}

export function CameraRig({ shake = 0 }: CameraRigProps) {
  const { camera } = useThree();
  const tmpPos = useRef(new THREE.Vector3());
  const tmpTarget = useRef(new THREE.Vector3());
  const currentTarget = useRef(new THREE.Vector3(0, 1, 0));
  const progress = useRef(0);
  const keyframes = useRef<CameraKeyframe[]>(DEFAULT_KEYFRAMES);

  // Build keyframes once the DOM has settled, and rebuild on resize.
  // The initial setTimeout(0) defers past the first paint so all
  // Scene components have mounted their sections and any layout-
  // affecting CSS has settled.
  useEffect(() => {
    let rafId: number | null = null;
    const rebuild = () => {
      keyframes.current = buildKeyframes();
    };
    const scheduleRebuild = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        rebuild();
      });
    };

    // Initial build after the next frame
    scheduleRebuild();
    // Second build after fonts/images may have shifted layout
    const settleTimer = setTimeout(scheduleRebuild, 600);

    window.addEventListener('resize', scheduleRebuild);
    window.addEventListener('load', scheduleRebuild);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearTimeout(settleTimer);
      window.removeEventListener('resize', scheduleRebuild);
      window.removeEventListener('load', scheduleRebuild);
    };
  }, []);

  useEffect(() => {
    const lenis = getLenis();
    if (!lenis) return;
    const handler = ({ progress: p }: { progress: number }) => {
      progress.current = p;
    };
    lenis.on('scroll', handler);
    return () => lenis.off('scroll', handler);
  }, []);

  useFrame((state, delta) => {
    // OVERRIDE PATH — explicit setCameraOverride wins over keyframes.
    // No Scene component currently sets one; reserved for emergencies
    // (e.g. a future modal that wants to dolly the camera somewhere
    // specific). Kept here so opt-in callers still work.
    const override = getCameraOverride();
    if (override) {
      tmpPos.current.set(override.pos[0], override.pos[1], override.pos[2]);
      tmpTarget.current.set(override.target[0], override.target[1], override.target[2]);

      if (shake > 0) {
        const t2 = state.clock.getElapsedTime();
        tmpPos.current.x += Math.sin(t2 * 1.8) * 0.04 * shake;
        tmpPos.current.y += Math.cos(t2 * 1.3) * 0.03 * shake;
      }

      camera.position.lerp(tmpPos.current, 1 - Math.pow(0.06, delta));
      currentTarget.current.lerp(tmpTarget.current, 1 - Math.pow(0.06, delta));
      camera.lookAt(currentTarget.current);
      return;
    }

    // PROGRESS PATH — continuous lerp between DOM-measured keyframes.
    // This is what produces the cinematic glide: as the visitor scrolls,
    // the camera target moves smoothly along the path defined by
    // adjacent keyframes, and the 0.06 lerp damps Lenis-frame jitter
    // without lagging visibly behind.
    const frames = keyframes.current;
    if (frames.length === 0) return;

    const p = clamp(progress.current, 0, 1);
    // Find the segment containing p
    let i = 0;
    for (let k = 0; k < frames.length - 1; k++) {
      if (p >= frames[k].t && p <= frames[k + 1].t) {
        i = k;
        break;
      }
    }
    if (p > frames[frames.length - 1].t) i = frames.length - 2;
    if (i < 0) i = 0;

    const a = frames[i];
    const b = frames[i + 1] ?? a;
    const span = b.t - a.t || 1;
    const local = clamp((p - a.t) / span, 0, 1);
    const eased = linear(local);

    tmpPos.current.set(
      THREE.MathUtils.lerp(a.pos[0], b.pos[0], eased),
      THREE.MathUtils.lerp(a.pos[1], b.pos[1], eased),
      THREE.MathUtils.lerp(a.pos[2], b.pos[2], eased),
    );
    tmpTarget.current.set(
      THREE.MathUtils.lerp(a.target[0], b.target[0], eased),
      THREE.MathUtils.lerp(a.target[1], b.target[1], eased),
      THREE.MathUtils.lerp(a.target[2], b.target[2], eased),
    );

    if (shake > 0) {
      const t2 = state.clock.getElapsedTime();
      tmpPos.current.x += Math.sin(t2 * 1.8) * 0.04 * shake;
      tmpPos.current.y += Math.cos(t2 * 1.3) * 0.03 * shake;
    }

    // 0.06 smoothing — cinematic-glide that damps Lenis micro-jitter
    // without lagging behind the user's scroll. The continuous lerp
    // BETWEEN keyframes (above) is what makes scene-to-scene motion
    // feel scrubbed; this smoothing just polishes the per-frame jitter.
    camera.position.lerp(tmpPos.current, 1 - Math.pow(0.06, delta));
    currentTarget.current.lerp(tmpTarget.current, 1 - Math.pow(0.06, delta));
    camera.lookAt(currentTarget.current);
  });

  return null;
}
