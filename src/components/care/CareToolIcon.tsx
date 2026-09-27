import type { CareMode } from './carePresentation';

/** Crisp CSS props match the bath, brush and particles in the activity scene. */
export function CareToolIcon({ mode }: { mode: CareMode }) {
  return <span className={`care-tool-icon care-tool-icon-${mode}`} aria-hidden="true"><i /></span>;
}
