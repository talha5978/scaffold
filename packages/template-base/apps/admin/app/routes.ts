import { flatRoutes } from "@react-router/fs-routes";

// Flat-file routing: `admin.tsx` is the protected layout, `admin._index.tsx`
// is its index child, and each generated `admin.<table>.tsx` (see
// packages/generator/src/engine.ts) becomes a child route at
// /admin/<table> purely by filename — no manual registration needed here,
// which is the whole point of using this convention for generated files.
export default flatRoutes();
