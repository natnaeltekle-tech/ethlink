# Component Standardization Notes

Historical rename checklist (many items already applied).

## Naming convention
Prefer **kebab-case** for component filenames, e.g. `service-card.tsx`, `dashboard-tabs.tsx`.

## Already cleaned (Tier 1 / earlier)
- Removed unused starter components (tutorial, logos, deploy-button, hero, notes routes).
- Removed duplicate `portfolio-chart.tsx` (was a copy of profile content).
- Removed unused `prefetch-add-route.tsx`.
- Removed weaker root `error-boundary.tsx` (layout uses `ui/error-boundary`).

## Still optional later
- Align remaining PascalCase splitters (`HomeSplitter.tsx`, etc.) if desired.
- Consolidate any remaining dual service-card variants after a visual QA pass.

*Moved to `/docs` so the repo root stays product-focused.*
