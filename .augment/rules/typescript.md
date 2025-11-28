---
type: "always_apply"
---

# TypeScript Standards

- Keep type definitions in the module closest to their usage; only create shared `types.ts` files when there is no clear home for the type definition.
- Order imports as external → internal → relative and avoid circular dependencies.
- Fix lint and type errors at the source; do not disable rules unless instructed otherwise.
