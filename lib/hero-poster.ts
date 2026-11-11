/**
 * The landing hero's poster: the live 3D scene's first frame, rendered from the
 * real scene by `npm run hero:poster` (scripts/hero-poster.mjs, from
 * /styleguide/hero). An e2e test fails if it no longer matches the scene.
 *
 * One 780 px WebP (about 22 KB): the live canvas's own resolution at most (the
 * hero caps its pixel ratio at 1.5 × 520 px), so it's as sharp as the scene.
 */
export const HERO_POSTER = {
  src: "/hero/poster.webp",
  size: 520,
};
