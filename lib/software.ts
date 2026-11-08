/**
 * Open-source software and fonts shipped to visitors, for the Credits page.
 * A test checks each licence against the installed package.json, so this list
 * can't drift from what's actually installed.
 */
export interface SoftwareCredit {
  name: string;
  /** npm package to check the licence against. */
  pkg: string;
  licence: string;
  url: string;
}

export const SOFTWARE: SoftwareCredit[] = [
  {
    name: "Next.js",
    pkg: "next",
    licence: "MIT",
    url: "https://github.com/vercel/next.js",
  },
  {
    name: "React",
    pkg: "react",
    licence: "MIT",
    url: "https://github.com/facebook/react",
  },
  {
    name: "three.js",
    pkg: "three",
    licence: "MIT",
    url: "https://github.com/mrdoob/three.js",
  },
  {
    name: "React Three Fiber",
    pkg: "@react-three/fiber",
    licence: "MIT",
    url: "https://github.com/pmndrs/react-three-fiber",
  },
  {
    name: "drei",
    pkg: "@react-three/drei",
    licence: "MIT",
    url: "https://github.com/pmndrs/drei",
  },
  {
    name: "Zustand",
    pkg: "zustand",
    licence: "MIT",
    url: "https://github.com/pmndrs/zustand",
  },
  {
    name: "Motion",
    pkg: "motion",
    licence: "MIT",
    url: "https://github.com/motiondivision/motion",
  },
  {
    name: "Radix UI",
    pkg: "radix-ui",
    licence: "MIT",
    url: "https://github.com/radix-ui/primitives",
  },
  {
    name: "shadcn/ui",
    pkg: "shadcn",
    licence: "MIT",
    url: "https://github.com/shadcn-ui/ui",
  },
  {
    name: "Lucide icons",
    pkg: "lucide-react",
    licence: "ISC",
    url: "https://github.com/lucide-icons/lucide",
  },
  {
    name: "Tailwind CSS",
    pkg: "tailwindcss",
    licence: "MIT",
    url: "https://github.com/tailwindlabs/tailwindcss",
  },
  {
    name: "glTF Transform (model compression)",
    pkg: "@gltf-transform/core",
    licence: "MIT",
    url: "https://github.com/donmccurdy/glTF-Transform",
  },
  {
    name: "Draco 3D decoder",
    pkg: "draco3dgltf",
    licence: "Apache-2.0",
    url: "https://github.com/google/draco",
  },
  {
    name: "Vercel Analytics",
    pkg: "@vercel/analytics",
    licence: "MIT",
    url: "https://github.com/vercel/analytics",
  },
  {
    name: "Sentry SDK",
    pkg: "@sentry/nextjs",
    licence: "MIT",
    url: "https://github.com/getsentry/sentry-javascript",
  },
];

/** Fonts are loaded through next/font (self-hosted at build time, not from Google at runtime). */
export const FONTS = [
  {
    name: "Geist and Geist Mono",
    licence: "SIL Open Font License 1.1",
    url: "https://github.com/vercel/geist-font",
  },
  {
    name: "IBM Plex Mono",
    licence: "SIL Open Font License 1.1",
    url: "https://github.com/IBM/plex",
  },
];
