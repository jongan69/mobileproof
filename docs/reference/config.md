# Configuration reference

The canonical machine-readable reference is
`packages/config/schema/mobileproof.schema.json`.

- `project`: workspace/app roots, framework, and package manager.
- `app`: iOS bundle and Android application IDs.
- `build`: named installed, Expo, EAS local, native, or custom profiles.
- `devices`: platform type and selection policy.
- `checks`: project-owned commands contributing evidence.
- `services`: managed local processes with optional health checks.
- `suites`: build profile, strictness, platforms, checks, and flows.
- `coverage`: capability manifest path.
- `artifacts`: output directory and local retention.
- `redaction`: environment secret names and custom detection patterns.
- `adapter`: project-owned versioned scenario module.
