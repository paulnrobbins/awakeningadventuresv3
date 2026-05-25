'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getLenis } from '@/lib/lenis';
import { clamp } from '@/lib/utils';
import { getCameraOverride } from '@/lib/cameraOverride';

/**
 * Camera rig — drives the camera position + look-target as a function of
 * global scroll progress.
 *
 * Phase 4a expands the keyframe table so the Stay range (~progress
 * 0.25-0.45) walks the camera past each of the four accommodations in
 * order: Stargazer → Driftwood treehouse → Homestead tent → Serene-Seven
 * tent. Each accommodation gets a 0.05 progress slice. The rig uses
 * cinematic easing on every transition so even quick scrolling looks
 * composed.
 */

type CameraKeyframe = {
  t: number;                      // global progress at this keyframe (0..1)
  pos: [number, number, number];
  target: [number, number, number];
  /** Optional per-segment ease — default power3-out. */
  ease?: 'linear' | 'ease-out' | 'ease-in-out';
};

// Camera keyframes — each keyframe's `t` is set to the SCROLL-PROGRESS
// START of the corresponding scene/card, so the subject is centered
// the moment the section becomes visible (rather than after the user
// has scrolled halfway through it). Linear interpolation between
// adjacent keyframes makes the camera sweep continuously from one
// focal point to the next as the visitor scrolls.
//
// Scroll-progress boundaries derived from rendered scene heights —
// REVISED for the 5-card Stay (Primitive Camp added). Total page is
// now 1670vh (was 1570vh), so every section past Stay shifts ~+0.06
// progress later:
//
//   Hero       100vh   → progress 0.000 - 0.060
//   Property   140vh   → progress 0.060 - 0.144
//   Stay       500vh   → progress 0.144 - 0.443  (5 sticky cards)
//     Stargazer    → starts 0.144
//     Driftwood    → starts 0.204
//     Homestead    → starts 0.263
//     Serene Seven → starts 0.323
//     Primitive    → starts 0.383
//   Shower     140vh   → starts 0.443
//   Trails     140vh   → starts 0.527
//   Lake       180vh   → starts 0.611
//   Welcome    140vh   → starts 0.719
//   Groups     140vh   → starts 0.803
//   Book       140vh   → starts 0.887
//   Footer      50vh   → starts 0.970
//
// Result: as the visitor enters each section, the camera is already
// composed on that section's subject. As they scroll through the
// section the camera drifts toward the next subject, arriving when
// the next section's content fades in.
const KEYFRAMES: CameraKeyframe[] = [
  // Opening aerial — held through the entire hero scene so the
  // visitor's first impression is the wide property.
  { t: 0.000, pos: [22,   22,   32], target: [0,   0,    -10] },
  // Property scene start — mid-descent. Camera is already moving
  // from aerial toward the cabins as the "Forty-two acres" copy reads.
  { t: 0.040, pos: [12,   14,   22], target: [0,   0.8,   -4] },
  // Stargazer — keyframe pulled ~2% earlier than card start (0.144)
  // so the cabin is centered BEFORE the visitor finishes scrolling
  // into the Stargazer card. Each subsequent Stay keyframe shifts
  // the same anticipation amount earlier so every subject leads its
  // content.
  { t: 0.124, pos: [-3.0, 1.8,   4.0], target: [0,   1.2,    0] },
  // Driftwood — card starts 0.204
  { t: 0.184, pos: [16,   4.0,  -6.0], target: [22,  4.0,  -16] },
  // Homestead — card starts 0.263, card on LEFT half of viewport.
  // Camera east of the Homestead tent at [-22, 0, -6]; look-target
  // ~1m east of the tent. Tent lands ~25% left of frame center,
  // large and clearly visible behind the card.
  { t: 0.244, pos: [-16,  2.0,   1.0], target: [-21, 1.0,   -6] },
  // Serene Seven — card starts 0.323, card on RIGHT. Eye-level
  // vantage from east-of-tent; target shifted west of the tent so
  // the tent renders on the RIGHT of the frame, behind the card.
  { t: 0.304, pos: [-22,  2.4, -16],   target: [-30, 1.5,  -25] },
  // Primitive Camp — card starts 0.383, card on LEFT. PrimitiveCamp
  // scene lives at world [-12, 0, -32]. Camera just east-and-in-
  // front-of the camp; look-target 1m east of the camp's X — camp
  // renders ~36% left of frame, behind the card, fire ring as focal
  // subject.
  { t: 0.363, pos: [-9,   1.6, -25],   target: [-11, 0.6,  -32] },
  // Shower scene — card starts 0.443. Text card on LEFT says
  // "Shower in the trees", Driftwood treehouse at [22, 0, -16] needs
  // to render LEFT of frame. Camera pulled WEST + closer; look-
  // target shifted ~4m EAST of the treehouse so the treehouse
  // appears left of frame center.
  { t: 0.423, pos: [10,   4.5,  -2.0], target: [26,  3.5,  -14] },
  // Trails — section starts 0.527. Wide eye-level view down the
  // central trail corridor.
  { t: 0.507, pos: [0,    2.0,  -3],   target: [0,   1.8,  -18] },
  // Lake — section starts 0.611. Shoreside view with the dock and
  // moored pontoon.
  { t: 0.591, pos: [-7,   3.2, -22],   target: [2,   0.4,  -40] },
  // Welcome — section starts 0.719. Sitting at the fire pit (the
  // pit is at [-2, 0, -8]). Camera centered on the pit's X, lowered
  // to seated-at-the-fire height; look-target dropped to flame-base
  // so embers + flame anchor the lower half of the frame behind the
  // centered "Hosted by us, Anthony and Barb" card.
  { t: 0.699, pos: [-2.6, 1.0,  -5.6], target: [-2,  0.35,  -7.8] },
  // Groups — section starts 0.803. Full pull-back to see the entire
  // property at late afternoon.
  { t: 0.783, pos: [14,   16,   20],   target: [-2,  0.5,   -6] },
  // Book — section starts 0.887. Return to a composition close to
  // the original hero so the visitor reads the final "Come and see"
  // against the same anchor they entered with.
  { t: 0.867, pos: [0,    1.4,   6.0], target: [0,   1.0,    0] },
  // Footer hold — same position so the camera doesn't drift past
  // the booking moment while the visitor scrolls through the footer.
  { t: 1.000, pos: [0,    1.4,   6.0], target: [0,   1.0,    0] },
];

interface CameraRigProps {
  /** Optional handheld shake amount (0..1). Welcome scene uses ~0.3. */
  shake?: number;
}

/**
 * Camera interpolation curve.
 *
 * We use LINEAR interpolation (`t` returned as-is) so the camera moves
 * in lock-step with the scroll wheel — the visitor scrolls, the camera
 * travels. Earlier this was a power3 ease-out, which finished 87% of
 * the move in the first 50% of scroll, making the camera "snap then
 * sit still" on every scene. Linear gives the true cinematic-scrub
 * feel of a Lando-Norris / Awwwards-style site where the camera is
 * effectively a Pro Tools playhead bound to the timeline.
 *
 * The eased path is left available for future opt-in (Welcome's
 * handheld micro-shake, for example, could ease in to feel handheld).
 */
function linear(t: number) {
  return t;
}

export function CameraRig({ shake = 0 }: CameraRigProps) {
  const { camera } = useThree();
  const tmpPos = useRef(new THREE.Vector3());
  const tmpTarget = useRef(new THREE.Vector3());
  const currentTarget = useRef(new THREE.Vector3(0, 1, 0));
  const progress = useRef(0);

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
    // OVERRIDE PATH — if a Scene component has set a camera target,
    // use that directly. Bypasses the progress-based lerp entirely so
    // ScrollTrigger-driven camera moves (e.g. SceneStay's per-card
    // transitions) are perfectly synced with the DOM card fade-ins.
    const override = getCameraOverride();
    if (override) {
      tmpPos.current.set(override.pos[0], override.pos[1], override.pos[2]);
      tmpTarget.current.set(override.target[0], override.target[1], override.target[2]);

      if (shake > 0) {
        const t2 = state.clock.getElapsedTime();
        tmpPos.current.x += Math.sin(t2 * 1.8) * 0.04 * shake;
        tmpPos.current.y += Math.cos(t2 * 1.3) * 0.03 * shake;
      }

      // Lerp tightened from 0.06 → 0.0001. The previous value gave a
      // ~0.5s catch-up which was fine for 4-card Stay but became
      // visible lag in the 5-card layout where each card has ~60vh
      // of scroll. 0.0001 gives ~0.2s — still smooths jitter from
      // Lenis, no longer reads as "camera is behind the scroll."
      camera.position.lerp(tmpPos.current, 1 - Math.pow(0.0001, delta));
      currentTarget.current.lerp(tmpTarget.current, 1 - Math.pow(0.0001, delta));
      camera.lookAt(currentTarget.current);
      return;
    }

    // PROGRESS PATH — keyframe lerp for every scene except Stay.
    const p = clamp(progress.current, 0, 1);
    let i = 0;
    for (let k = 0; k < KEYFRAMES.length - 1; k++) {
      if (p >= KEYFRAMES[k].t && p <= KEYFRAMES[k + 1].t) {
        i = k;
        break;
      }
      if (p > KEYFRAMES[KEYFRAMES.length - 1].t) i = KEYFRAMES.length - 2;
    }
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1] ?? a;
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

    // Camera-position lerp: was 0.06 for cinematic-glide, now 0.0001
    // for scroll-tight tracking. The 0.06 value worked when each
    // Stay card had ~0.06 progress of scroll runway; adding the
    // Primitive Camp shrank per-card scroll to ~0.06 / 1.25 and
    // the old smoothing meant the camera arrived ~0.5s after the
    // user landed on a card. 0.0001 brings catch-up to ~0.2s
    // while still damping Lenis-frame jitter. The shake math
    // above still produces handheld micro-motion on top.
    camera.position.lerp(tmpPos.current, 1 - Math.pow(0.0001, delta));
    currentTarget.current.lerp(tmpTarget.current, 1 - Math.pow(0.0001, delta));
    camera.lookAt(currentTarget.current);
  });

  return null;
}
