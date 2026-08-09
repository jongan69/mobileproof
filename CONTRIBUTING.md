# Contributing

Use Node.js 22+ and pnpm 11. Run `pnpm check` before opening a pull request.
Public interfaces require tests, documentation, and a changeset. Security-
sensitive changes require a threat-model note in the pull request.

Keep adapters deterministic, pass commands as argument arrays, never print
environment values, and leave project state unchanged after failed runs.
