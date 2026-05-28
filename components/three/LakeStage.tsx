'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { LakeWater } from './LakeWater';
import { modelUrl } from '@/lib/three';
// NOTE: The procedural ./Dock primitive is no longer rendered here —
// replaced by the SketchfabDock GLB component below. The file is kept
// in the codebase as a fallback in case the Sketchfab fetch fails.

/**
 * Wood-textured pier model from Sketchfab — "Simple Wooden Pier or Dock"
 * by Jungle Jim (CC-BY 4.0). Replaces the procedural <Dock /> primitive
 * for visible-distance shots. Credited on /credits per CC-BY 4.0.
 */
function SketchfabDock(props: { position: [number, number, number]; rotationY?: number }) {
  const { scene } = useGLTF(modelUrl('dock.glb'));
  return (
    <group position={props.position} rotation={[0, props.rotationY ?? 0, 0]}>
      <primitive object={scene.clone()} />
    </group>
  );
}

/**
 * Drifting canoe — Sketchfab CC-BY model by SkyeSladeUT. Loops a slow
 * left-to-right traverse of the foreground water with a gentle bob and
 * yaw drift, ~80 seconds per pass. Sells "the lake is alive" without
 * needing camera changes. The empty horizon pontoon (PontoonBoat in
 * WorldScene) keeps drifting in parallel.
 */
function DriftingCanoe() {
  const ref = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUrl('canoe.glb'));

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const period = 80;
    const phase = (t % period) / period; // 0..1
    // X traverses -25 to +25 across the foreground water
    ref.current.position.x = -25 + phase * 50;
    // Gentle bob + tiny yaw to imply paddling
    ref.current.position.y = -0.15 + Math.sin(t * 0.85) * 0.04;
    ref.current.rotation.y = Math.PI / 2 + Math.sin(t * 0.4) * 0.04;
    ref.current.rotation.z = Math.sin(t * 0.65) * 0.02;
  });

  return (
    <group ref={ref} position={[0, -0.15, -22]} scale={1.1}>
      <primitive object={scene.clone()} />
    </group>
  );
}

// Preload both GLBs so the camera arrival at the lake doesn't stutter
// while the geometry decodes.
useGLTF.preload(modelUrl('dock.glb'));
useGLTF.preload(modelUrl('canoe.glb'));

/**
 * The Lake scene staging — Watts Bar Lake with a wooden dock extending
 * out into the water, a pontoon boat moored at the dock's end with a
 * gentle bob (not drifting across the horizon like the original
 * PontoonBoat — this one is parked, waiting for Anthony to take guests
 * out).
 *
 * Geographic placement: this group sits at world Z = -30, well past
 * the property layout, so it's "twenty minutes from the property"
 * spatially as well as in copy. The LakeWater plane extends 280m to
 * the horizon.
 *
 * Camera at the Lake scene keyframe (CameraRig) is tuned to frame the
 * dock extending toward the moored boat with the lake stretching to
 * the horizon behind.
 */
export function LakeStage() {
  return (
    <group position={[0, 0, -30]}>
      {/* The lake itself — covers the full horizon */}
      <LakeWater position={[0, -0.35, 0]} size={[320, 320]} />

      {/* Sandy shore beach edge — a band of warm gravel where the dock
          meets the land. Drawn BEFORE the dock so dock decking sits
          visually on top. */}
      <mesh position={[0, -0.10, 1.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 5]} />
        <meshStandardMaterial color="#C9AC85" roughness={0.95} />
      </mesh>

      {/* Dock — Sketchfab CC-BY model (Jungle Jim) replaces the
          procedural primitive. Position matches the previous origin
          at the SHORE end with the lakeside (mooring) end pointing
          into the water. */}
      <SketchfabDock position={[0, 0, -4]} rotationY={0} />

      {/* Drifting canoe — Sketchfab CC-BY model (SkyeSladeUT). Slow
          left-to-right traverse of the foreground water on an 80-sec
          cycle. */}
      <DriftingCanoe />

      {/* Pontoon moored alongside the dock's lakeside end. Sits parallel
          to the dock with its long axis pointing along -X away from the
          dock. Bobs in place. */}
      <MooredPontoon position={[4.8, 0.05, -7]} rotationY={Math.PI / 2} />

      {/* A second smaller island silhouette far on the horizon —
          gives the visitor a target for "the island campsite". */}
      <Island position={[36, -0.3, -60]} />
      <Island position={[-44, -0.3, -78]} scale={0.6} />
    </group>
  );
}

/**
 * Moored pontoon — same primitive build as PontoonBoat but it bobs in
 * place instead of drifting. Tied to the dock with a short rope.
 */
function MooredPontoon({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    // Gentle vertical bob + tiny yaw drift
    ref.current.position.y = position[1] + Math.sin(t * 0.7) * 0.06;
    ref.current.rotation.y = rotationY + Math.sin(t * 0.4) * 0.015;
    ref.current.rotation.z = Math.sin(t * 0.55) * 0.012;
  });

  // Brand boat colors — pulled from the actual photo of the
  // Awakening Adventures pontoon:
  //   hull / skirt panel: deep forest green
  //   bimini canopy:      same deep green
  //   cushioned seats:    warm beige tan
  //   railing:            light aluminum
  const C_HULL = '#2B5D3F';
  const C_CANOPY = '#244F35';
  const C_CUSHION = '#B89F76';
  const C_RAIL = '#C8C8C2';
  const C_PONTOON = '#9CA3A8';   // light aluminum tubes (mostly hidden by skirt)
  const C_DECK = '#7C5630';

  return (
    <group ref={ref} position={position} rotation={[0, rotationY, 0]}>
      {/* Aluminum pontoon tubes underneath */}
      <mesh position={[0, -0.05, 0.7]}>
        <cylinderGeometry args={[0.18, 0.18, 6.0, 10]} />
        <meshStandardMaterial color={C_PONTOON} roughness={0.45} metalness={0.7} />
      </mesh>
      <mesh position={[0, -0.05, -0.7]}>
        <cylinderGeometry args={[0.18, 0.18, 6.0, 10]} />
        <meshStandardMaterial color={C_PONTOON} roughness={0.45} metalness={0.7} />
      </mesh>

      {/* Deck (wood/composite floor) */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[6.2, 0.10, 2.0]} />
        <meshStandardMaterial color={C_DECK} roughness={0.85} />
      </mesh>

      {/* DARK GREEN HULL SKIRT — four side panels wrapping the deck.
          This is the signature visual element of the real boat. */}
      <mesh position={[0, 0.10, 1.02]}>
        <boxGeometry args={[6.2, 0.42, 0.04]} />
        <meshStandardMaterial color={C_HULL} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.10, -1.02]}>
        <boxGeometry args={[6.2, 0.42, 0.04]} />
        <meshStandardMaterial color={C_HULL} roughness={0.72} />
      </mesh>
      <mesh position={[3.1, 0.10, 0]}>
        <boxGeometry args={[0.04, 0.42, 2.04]} />
        <meshStandardMaterial color={C_HULL} roughness={0.72} />
      </mesh>
      <mesh position={[-3.1, 0.10, 0]}>
        <boxGeometry args={[0.04, 0.42, 2.04]} />
        <meshStandardMaterial color={C_HULL} roughness={0.72} />
      </mesh>

      {/* "Awakening Adventures" name plate — small white band on the
          side hull. At camera distance this reads as the logo decal. */}
      <mesh position={[0, 0.16, 1.045]}>
        <boxGeometry args={[2.4, 0.10, 0.005]} />
        <meshStandardMaterial color="#F2EEE0" roughness={0.5} />
      </mesh>

      {/* Aluminum railing — top rail running around the deck perimeter */}
      {/* Long sides */}
      <mesh position={[0, 0.78, 1.02]}>
        <boxGeometry args={[6.2, 0.04, 0.04]} />
        <meshStandardMaterial color={C_RAIL} roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.78, -1.02]}>
        <boxGeometry args={[6.2, 0.04, 0.04]} />
        <meshStandardMaterial color={C_RAIL} roughness={0.35} metalness={0.7} />
      </mesh>
      {/* Short sides (gate gap at the dock side) */}
      <mesh position={[3.1, 0.78, 0]}>
        <boxGeometry args={[0.04, 0.04, 2.04]} />
        <meshStandardMaterial color={C_RAIL} roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[-3.1, 0.78, 0.55]}>
        <boxGeometry args={[0.04, 0.04, 0.9]} />
        <meshStandardMaterial color={C_RAIL} roughness={0.35} metalness={0.7} />
      </mesh>
      {/* Vertical rail posts every meter or so */}
      {[-2.4, -1.2, 0, 1.2, 2.4].map((x) => (
        <group key={`rail-${x}`}>
          <mesh position={[x, 0.55, 1.02]}>
            <cylinderGeometry args={[0.018, 0.018, 0.5, 6]} />
            <meshStandardMaterial color={C_RAIL} roughness={0.35} metalness={0.7} />
          </mesh>
          <mesh position={[x, 0.55, -1.02]}>
            <cylinderGeometry args={[0.018, 0.018, 0.5, 6]} />
            <meshStandardMaterial color={C_RAIL} roughness={0.35} metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Cushioned bench seats wrapping the deck — three sections */}
      {/* Long bench along the back */}
      <mesh position={[0.4, 0.50, -0.62]}>
        <boxGeometry args={[5.2, 0.20, 0.7]} />
        <meshStandardMaterial color={C_CUSHION} roughness={0.85} />
      </mesh>
      {/* Right-side L bench */}
      <mesh position={[2.6, 0.50, 0.25]}>
        <boxGeometry args={[0.7, 0.20, 1.0]} />
        <meshStandardMaterial color={C_CUSHION} roughness={0.85} />
      </mesh>
      {/* Forward bench (in front of helm) */}
      <mesh position={[-1.6, 0.50, 0.5]}>
        <boxGeometry args={[1.2, 0.20, 0.7]} />
        <meshStandardMaterial color={C_CUSHION} roughness={0.85} />
      </mesh>

      {/* Helm console — boxy front-left */}
      <mesh position={[-2.3, 0.55, -0.4]}>
        <boxGeometry args={[0.55, 0.55, 0.7]} />
        <meshStandardMaterial color="#2A2520" roughness={0.6} />
      </mesh>
      {/* Steering wheel on top of the helm */}
      <mesh position={[-2.3, 0.85, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.14, 0.018, 8, 16]} />
        <meshStandardMaterial color="#1A1410" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* BIMINI CANOPY — dark green canvas over four support posts.
          Lower profile than before (1.55m clearance vs 1.85m). The
          canopy spans only the rear two-thirds of the deck, matching
          the real boat. */}
      {[
        [-0.8,  0.95],   // front-port
        [-0.8, -0.95],   // front-starboard
        [ 2.7,  0.95],   // back-port
        [ 2.7, -0.95],   // back-starboard
      ].map(([x, z], i) => (
        <mesh key={`bimini-post-${i}`} position={[x, 1.10, z]}>
          <cylinderGeometry args={[0.025, 0.025, 1.20, 6]} />
          <meshStandardMaterial color={C_RAIL} roughness={0.35} metalness={0.7} />
        </mesh>
      ))}

      {/* Bimini canvas — dark green, gentle arch */}
      <mesh position={[0.95, 1.62, 0]} castShadow>
        <boxGeometry args={[3.8, 0.05, 2.1]} />
        <meshStandardMaterial color={C_CANOPY} roughness={0.78} />
      </mesh>
      {/* Front edge of canopy (slightly forward-sloping for the look) */}
      <mesh position={[-0.85, 1.55, 0]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[0.4, 0.05, 2.1]} />
        <meshStandardMaterial color={C_CANOPY} roughness={0.78} />
      </mesh>

      {/* Two orange/blue dock fenders hanging from the rail —
          small but the kind of detail that reads as "real boat" */}
      <mesh position={[-3.1, 0.4, 0.4]}>
        <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
        <meshStandardMaterial color="#4A6FA8" roughness={0.7} />
      </mesh>
      <mesh position={[-3.1, 0.4, -0.4]}>
        <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
        <meshStandardMaterial color="#D87A3A" roughness={0.7} />
      </mesh>

      {/* Mooring rope from boat to dock */}
      <mesh position={[-3.2, 0.62, 0.9]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.018, 0.018, 1.3, 6]} />
        <meshStandardMaterial color="#8B7355" roughness={0.95} />
      </mesh>
    </group>
  );
}

/**
 * Distant island — a low, tree-fringed silhouette on the horizon.
 * Sells "boat-in island campsite" without needing detailed geometry.
 */
function Island({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      {/* Island mass — flattened ellipsoid */}
      <mesh receiveShadow>
        <sphereGeometry args={[6, 16, 10]} />
        <meshStandardMaterial color="#3D4A30" roughness={0.95} />
      </mesh>
      {/* Tree silhouettes — a small cluster of cones */}
      {Array.from({ length: 7 }).map((_, i) => {
        const angle = (i / 7) * Math.PI * 1.6 - Math.PI * 0.3;
        const r = 3 + Math.random() * 1.5;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const h = 2.5 + Math.random() * 1.8;
        return (
          <mesh key={i} position={[x, h / 2 + 1, z]} castShadow>
            <coneGeometry args={[0.9, h, 6]} />
            <meshStandardMaterial color="#2F3B26" roughness={0.95} />
          </mesh>
        );
      })}
    </group>
  );
}
