'use client';

import { Environment } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { hdriUrl } from '@/lib/three';
import { getLenis } from '@/lib/lenis';
import { SCENES, type SceneConfig } from '@/content/scenes';
import { clamp } from '@/lib/utils';
import { WorldErrorBoundary } from './WorldErrorBoundary';

/**
 * Drives scene-level lighting & fog from global scroll progress.
 *
 * Perf note: this component owns its OWN Lenis subscription rather
 * than taking a `progress` prop from the parent. The previous prop-
 * based design meant WorldScene held a `progress` state that updated
 * at 60Hz during scroll — triggering a full React re-render of the
 * entire 3D component tree (TreeBank, every conditional Stage, every
 * floor mesh) sixty times per second. Now the 60Hz updates stay
 * isolated INSIDE this component. WorldScene only re-renders on the
 * rare mount-flag changes.
 *
 * The internal state tracks only the active scene INDEX (0..N), not
 * raw progress. So this component itself only re-renders when the
 * visitor crosses a scene boundary — typically once or twice per
 * scroll-through.
 */
export function EnvironmentRig() {
  const { scene } = useThree();
  const [sceneIdx, setSceneIdx] = useState(0);

  useEffect(() => {
    const lenis = getLenis();
    if (!lenis) return;
    const handler = ({ progress }: { progress: number }) => {
      const next = clamp(Math.floor(progress * SCENES.length), 0, SCENES.length - 1);
      setSceneIdx((prev) => (prev === next ? prev : next));
    };
    lenis.on('scroll', handler);
    return () => lenis.off('scroll', handler);
  }, []);

  const activeScene: SceneConfig = useMemo(() => SCENES[sceneIdx], [sceneIdx]);

  useEffect(() => {
    const color = new THREE.Color(activeScene.fog);
    scene.fog = new THREE.Fog(color, activeScene.fogNear, activeScene.fogFar);
    // Per-scene sky tint — keeps the daytime feel and lets fog blend
    // smoothly into the visible horizon. WorldCanvas sets a default;
    // each scene refines it.
    scene.background = new THREE.Color(activeScene.fog);
  }, [scene, activeScene]);

  return (
    <>
      {/* Bright warm ambient — fills the shadow side of every object */}
      <ambientLight intensity={0.55} color="#FFF6E0" />

      {/* Sun key light — slight east, slight south, warm color */}
      <directionalLight
        position={[14, 22, 10]}
        intensity={2.2}
        color="#FFE9B8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={60}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
      />

      {/* Subtle sky bounce — cool blue from above to anchor it as outdoors */}
      <hemisphereLight args={['#BFD2DF', '#5E6F4A', 0.45]} />

      {/* HDRI environment — daytime captures from Poly Haven. Errors
          silently if the .hdr file isn't dropped in yet. */}
      <WorldErrorBoundary>
        <Suspense fallback={null}>
          <Environment
            files={hdriUrl(activeScene.hdri)}
            background={false}
            environmentIntensity={0.85}
          />
        </Suspense>
      </WorldErrorBoundary>
    </>
  );
}
