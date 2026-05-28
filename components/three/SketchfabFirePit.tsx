'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { modelUrl } from '@/lib/three';

const FIREPIT_URL = modelUrl('firepit.glb');

/**
 * Sketchfab GLB campfire — "Glowing Campfire With Stones, Coal and Logs"
 * by Dennis (CC-BY 4.0). Replaces the procedural FirePit with a real
 * photogrammetric model: stones, charred logs, glowing coal bed,
 * baked-in fire texture.
 *
 * The model itself is static. We add:
 *   - A flickering warm point light on top (atmospheric illumination)
 *   - Three subtle animated flame sprites for motion (so it doesn't
 *     read as a paused freeze-frame)
 *
 * Source: https://skfb.ly/pFwxQ — CC-BY 4.0 attribution at /credits
 */
export function SketchfabFirePit({
  position = [0, 0, 0],
  glow = 1.0,
  scale = 1.0,
  rotationY = 0,
}: {
  position?: [number, number, number];
  glow?: number;
  scale?: number;
  rotationY?: number;
}) {
  const { scene } = useGLTF(FIREPIT_URL);
  const lightRef = useRef<THREE.PointLight>(null);
  const flameRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Flickering point light — main atmospheric illumination
    if (lightRef.current) {
      lightRef.current.intensity =
        glow * (3.0 + Math.sin(t * 2.8) * 0.7 + Math.sin(t * 7.1) * 0.3);
    }
    // Flame sprites — gentle bob and rotate so the fire reads alive
    flameRefs.current.forEach((m, i) => {
      if (!m) return;
      m.rotation.y = t * (0.5 + i * 0.2);
      const s = 1 + Math.sin(t * (3 + i) + i) * 0.06;
      m.scale.set(s, 1 + Math.sin(t * 4 + i) * 0.04, s);
    });
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* GLB campfire model — Dennis, CC-BY 4.0 */}
      <primitive object={scene.clone()} />

      {/* Three subtle animated flame sprites on top of the GLB so the
          campfire reads alive instead of a freeze-frame. Scaled small
          (~0.3m) since the GLB already has its own coal/flame texture
          at the base. */}
      {[0, 1, 2].map((i) => {
        const h = 0.32 - i * 0.06;
        const w = 0.22 - i * 0.04;
        const yOffset = 0.28 + i * 0.06;
        const colors = ['#FFB155', '#FF8132', '#FF5520'];
        return (
          <mesh
            key={`flame-${i}`}
            ref={(m) => {
              flameRefs.current[i] = m;
            }}
            position={[0, yOffset, 0]}
          >
            <coneGeometry args={[w, h, 8]} />
            <meshBasicMaterial
              color={colors[i]}
              toneMapped={false}
              transparent
              opacity={0.7 - i * 0.12}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* Flickering atmospheric point light */}
      <pointLight
        ref={lightRef}
        position={[0, 0.55, 0]}
        color="#FF7838"
        intensity={glow * 3.5}
        distance={9}
        decay={1.8}
        castShadow={false}
      />
    </group>
  );
}

useGLTF.preload(FIREPIT_URL);
