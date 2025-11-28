---
type: "always_apply"
---

# General Development Standards

- Prefer direct control flow: minimal branching, early returns, and the simplest viable implementation.
- Never write code that provides more functionality than is currently being used.
- Function signatures should not have parameters that are not utilized in the current system.
- Never code for backwards compatibility.
- Never code for future flexibility - only implement what is needed today.
- Always remove legacy code.
- Never leave placeholder functions or no-op functions in the codebase.
- Never leave functions with only comments and no implementation.
