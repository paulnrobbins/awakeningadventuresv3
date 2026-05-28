# Sketchfab Handoff — 3D Asset Upgrades

The procedural primitives (Tent, FirePit, Treehouse, etc.) ship the site but are intentionally simple. Replacing the highest-impact ones with real Sketchfab models lifts the visual fidelity by 5× without touching the camera system.

This doc lists the **specific models worth chasing**, the **search URLs to browse them on your Mac**, the **license filter that's safe for the commercial site**, and the **one-line code swap** for each.

The fetch script is already wired: `scripts/fetch-sketchfab-model.mjs`. Workflow per model is ~2 minutes.

## License safety — only download these

The Sketchfab license filter URL parameter `licenses=` accepts UUIDs. The three commercial-safe licenses are pre-filtered into every search URL below:

| License | UUID | Notes |
|---|---|---|
| **CC-BY** | `322a749bcfa841b29dff1e8a1bb74b0b` | Free for commercial use, requires credit (auto-logged) |
| **CC0** | `7c23a1ba438d4306920229c12afcb5f9` | Public domain, no attribution required |
| **Sketchfab Standard** | `b9ddc40b93e34cdca1fc152f39b9f375` | Sketchfab's free standard, commercial-OK |

**Never use** CC-BY-NC, CC-BY-NC-SA, or "Editorial" — illegal on a commercial booking site. The `fetch-sketchfab-model.mjs` script already refuses to download these, but knowing the filter saves time when browsing.

## Workflow per model

1. Open the search URL on your Mac (browser).
2. Pick a model that fits — check polycount, dimensions, and visual style.
3. Copy the **UID** from the URL (the 32-char hex string at the end: `sketchfab.com/3d-models/some-name-<UID>`).
4. Run on your Mac:
   ```bash
   cd ~/Desktop/Kingdom-Digital-Services/Websites/awakening-adventures
   npm run fetch:model <UID> <output-name>
   ```
5. The GLB lands at `public/models/<output-name>.glb` with attribution logged to `public/models/ATTRIBUTIONS.json`.
6. Apply the one-line code swap below for that model.

## The five upgrades, ranked by impact

### 1. Bell Tent — replaces `components/three/Tent.tsx` procedural geometry

The Homestead + Serene-Seven tents are currently flat canvas planes with poles. A real glamping bell tent (round canvas, central pole, doors, guy ropes) reads dramatically better in close-up shots when the camera lands on the Stay cards.

**Search URL** (paste into browser):
```
https://sketchfab.com/search?q=bell+tent&type=models&features=downloadable&sort_by=-likeCount&licenses=322a749bcfa841b29dff1e8a1bb74b0b&licenses=7c23a1ba438d4306920229c12afcb5f9&licenses=b9ddc40b93e34cdca1fc152f39b9f375
```

**What to look for:**
- "Bell tent" or "canvas glamping tent"
- Polycount < 30,000 triangles (anything more will need decimation)
- Canvas color: white/cream/khaki (matches AA's natural palette)
- Has guy ropes + pole if possible (sells "real tent")

**Fetch + integrate:**
```bash
npm run fetch:model <UID> bell-tent
```

Then in `components/three/Tent.tsx`, swap the procedural body for:
```tsx
import { useGLTF } from '@react-three/drei';
import { modelUrl } from '@/lib/three';

const { scene } = useGLTF(modelUrl('bell-tent.glb'));
// Inside the existing Tent component's group, replace the
// procedural geometry with: <primitive object={scene.clone()} />
// Keep the existing position/rotationY/glow props as-is.
```

### 2. Campfire / Fire Ring — replaces the FirePit primitive in `PropertyLayout.tsx`

The Welcome fire pit is currently a stone ring + flickering point light. A real model with logs, ember texture, and proper flame mesh would be the most-visible win since it's centered behind the "Hosted by us" card.

**Search URL:**
```
https://sketchfab.com/search?q=campfire+stones+logs&type=models&features=downloadable&sort_by=-likeCount&licenses=322a749bcfa841b29dff1e8a1bb74b0b&licenses=7c23a1ba438d4306920229c12afcb5f9&licenses=b9ddc40b93e34cdca1fc152f39b9f375
```

**What to look for:**
- Stone ring + crossed logs + visible embers
- < 15,000 triangles
- NO animated flame (we keep the existing flickering point light)
- Diameter ~1.5–2m (close to the existing FirePit footprint)

**Fetch + integrate:**
```bash
npm run fetch:model <UID> firepit
```

Then in `components/three/FirePit.tsx`, replace the procedural mesh with:
```tsx
const { scene } = useGLTF(modelUrl('firepit.glb'));
return (
  <group position={position}>
    <primitive object={scene.clone()} />
    {/* Keep the existing flickering point light + ember disc here */}
  </group>
);
```

### 3. Wooden Dock — replaces `components/three/Dock.tsx`

The lake dock is a box-and-stilts primitive. A real worn-wood dock with proper planks, posts, and slight variation in board widths reads as "Anthony's actual dock" instead of "any dock."

**Search URL:**
```
https://sketchfab.com/search?q=wooden+dock+pier&type=models&features=downloadable&sort_by=-likeCount&licenses=322a749bcfa841b29dff1e8a1bb74b0b&licenses=7c23a1ba438d4306920229c12afcb5f9&licenses=b9ddc40b93e34cdca1fc152f39b9f375
```

**What to look for:**
- "Wooden dock" / "lake pier" / "fishing dock"
- ~6–10m long (close to the existing 8m dock)
- Warm wood tone (no painted colors)
- Posts visible at the lakeside end

**Fetch + integrate:**
```bash
npm run fetch:model <UID> dock
```

Then in `LakeStage.tsx`, replace `<Dock position={[0, 0, -4]} ... />` with:
```tsx
import { useGLTF } from '@react-three/drei';
const { scene: dockScene } = useGLTF(modelUrl('dock.glb'));
// Replace the <Dock /> tag with:
<primitive object={dockScene.clone()} position={[0, 0, -4]} />
```

### 4. Canoe / Kayak on the lake horizon (NEW visual element)

Right now the lake has the moored pontoon at the dock and a far-off drifting pontoon. Adding a single canoe with a paddler silhouette gliding across the foreground water sells "active lake, real life happening" without adding camera complexity.

**Search URL:**
```
https://sketchfab.com/search?q=canoe+wooden&type=models&features=downloadable&sort_by=-likeCount&licenses=322a749bcfa841b29dff1e8a1bb74b0b&licenses=7c23a1ba438d4306920229c12afcb5f9&licenses=b9ddc40b93e34cdca1fc152f39b9f375
```

**What to look for:**
- Wooden canoe, ~5m long
- Low-poly (< 8,000 triangles) — it's a small accent, not a hero
- Single hull, slim profile

**Fetch + integrate:**
```bash
npm run fetch:model <UID> canoe
```

Then in `LakeStage.tsx`, add a new `<DriftingCanoe />` component near the bottom of the file, modeled on the existing `PontoonBoat` drift pattern:
```tsx
function DriftingCanoe() {
  const ref = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUrl('canoe.glb'));
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    // Slow drift X = -30 → +30 over 80 seconds, gentle bob
    const phase = (t % 80) / 80;
    ref.current.position.x = -30 + phase * 60;
    ref.current.position.y = -0.20 + Math.sin(t * 0.7) * 0.05;
  });
  return <primitive ref={ref} object={scene.clone()} position={[0, -0.20, -45]} />;
}
// Then mount it inside <LakeStage>:
//   <DriftingCanoe />
```

### 5. Rock Bridge — replaces the box-primitive arch in `ForestScene.tsx`

The current rock bridge is dodecahedron boulders + a box capstone. A real moss-covered stone bridge model would be a beautiful focal element on the trails scene.

**Search URL:**
```
https://sketchfab.com/search?q=stone+bridge+rock+arch&type=models&features=downloadable&sort_by=-likeCount&licenses=322a749bcfa841b29dff1e8a1bb74b0b&licenses=7c23a1ba438d4306920229c12afcb5f9&licenses=b9ddc40b93e34cdca1fc152f39b9f375
```

**What to look for:**
- Small footbridge or rock arch (2–4m wide)
- Stone or moss-covered, weathered
- < 20,000 triangles
- Mossy/natural — not modern/cut-stone

**Fetch + integrate:**
```bash
npm run fetch:model <UID> rock-bridge
```

Then in `ForestScene.tsx`, replace the inline rock-bridge `<group>` block with:
```tsx
import { useGLTF } from '@react-three/drei';
const { scene: bridgeScene } = useGLTF(modelUrl('rock-bridge.glb'));
// Inside the ForestScene group, replace the entire
//   {/* Rock bridge — stacked boulders... */}
// block with:
<primitive object={bridgeScene.clone()} position={[0.6, 0, 5]} rotation={[0, 0.18, 0]} />
```

## After downloading

Each `fetch-sketchfab-model.mjs` run appends an entry to `public/models/ATTRIBUTIONS.json`. For CC-BY models you legally must credit the author somewhere on the public site. Two options:

1. **Hidden credits page at `/credits`** — a simple page that reads `ATTRIBUTIONS.json` at build time and lists each model + author + source URL.
2. **Footer line** — "3D models by Sketchfab community contributors" with a link to `/credits`.

I'll wire this up when the first model lands. Ping me with the UID and output name once you've grabbed it.

## Quick wins ordered by effort

| Effort | Win | Why |
|---|---|---|
| 5 min | Campfire | Highest visible impact, smallest swap |
| 10 min | Bell tent | Used in 2 places (Homestead + Serene Seven) — one model serves both |
| 10 min | Wooden dock | Single component swap, instantly elevates the lake scene |
| 15 min | Canoe | New element with motion logic — ~10 lines of code |
| 20 min | Rock bridge | Replaces an inline block, slight position tuning needed |

Total: ~1 hour for all five, transforms the site's 3D fidelity from "stylized procedural" to "real place, real models."

## Need a different model than what's listed?

Send me a Sketchfab URL and I'll write the integration code for it. The fetch script handles any UID — these five are just the highest-leverage starting points.
