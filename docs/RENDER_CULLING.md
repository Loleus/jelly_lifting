# Culling and Shadows

## Checkpoint Flags

- `src/engine/fx/CheckpointFlag.ts` owns each flag's deformable surface.
- Its permanent bounding box/sphere includes every wave phase, with a small numerical margin. Native frustum culling is enabled for both color and shadow rendering.
- `src/engine/render/FlagVisibility.ts` checks the current view and the water reflection before allowing CPU deformation. Its tower occlusion test is conservative and respects the finite height of the tower.
- If neither color view needs the flag, its positions and normals are not updated and no new vertex buffer upload is requested. The existing shape remains available to cast a static shadow. Shadow-map rendering itself still has a cost.
- On return, the surface is evaluated directly at the current time. There is no accumulated simulation to catch up. The wave still has one band, amplitude 0.24, and a pinned edge at the pole.
- A flag visible only in the water reflection stays animated. The reflection test omits Water.js's oblique clip plane to avoid false negatives near view edges.

## Moving Casters

Elevators, uncollected gems, enemies and checkpoint meshes no longer use camera-dependent `Object3D.visible = false`. Three.js r185 skips invisible objects in the shadow pass as well, even if `castShadow` is true.

They now use native frustum culling independently for the main camera, water camera and light. The current mesh transform supplies the bounds, including the jumping ball's current height and the elevator's current position. Tower occlusion in the color pass is handled by the depth buffer, not by removing the caster from the scene.

Gems continue their bob/rotation outside the main view so their shadows move. Collecting a gem intentionally removes it and its shadow; restarting restores it. Enemy/elevator physics, collision and sound logic are unchanged.

The existing custom instanced-stair/spring/door/summit culling is outside this change. It still uses the earlier rules; this change does not claim to fix every shadow caster in the scene.

## Verification

`tests/rendering-culling.test.mjs` executes nine CPU regression tests against the real TypeScript classes and Three.js frusta. Run it with `node tests/rendering-culling.test.mjs`, or run `npm run build`; the local startup checks invoke the tests and fail on an assertion error. No assets or sources are restored, downloaded or generated. Missing local assets stop the build with an explicit file list.

The tests cover hidden buffer stability, wake-up phase, full wave bounds, 60/144/260 Hz sampling, retained offscreen shadow casters, water-only visibility, finite-tower occlusion, moving bounds and collected gems.

These are not GPU image comparisons or hardware FPS measurements. The final rasterized shadow appearance still requires a browser/WebGL visual check. Existing font warnings are unrelated to this change.