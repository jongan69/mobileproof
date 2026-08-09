# MobileProof

MobileProof gives React Native teams auditable local evidence that an app
installs, launches, completes declared journeys, survives configured failure
conditions, and does not leak registered secrets into test artifacts.

It is local-first, MIT licensed, framework-layout agnostic, and powered by
Maestro. It supports Expo, Expo Router, bare React Native, monorepos, iOS
Simulators, Android emulators, and USB-connected Android devices.

## Quick start

```bash
npm install --save-dev mobileproof
npx mobileproof init --ready-id app.ready
npx mobileproof doctor
npx mobileproof run smoke
```

Use an existing stable `testID`, or install `mobileproof-react-native` and add
`<ProofReady />` to the first usable screen.

MobileProof reports one of three evidence levels:

- **Smoke Verified:** configured basic journeys pass.
- **Capability Verified:** declared applicable capabilities have evidence.
- **Release Verified:** strict coverage, required platforms, checks, privacy
  scan, and artifact-bound evidence all pass.

It does not claim that arbitrary software is bug-free. Read [What verification
means](docs/concepts/verification.md) before using a badge as a release gate.

## Commands

```text
mobileproof init       Detect and scaffold a project
mobileproof doctor     Check tools, configuration, and platforms
mobileproof inspect    Print resolved paths, suites, and devices
mobileproof run        Execute a suite
mobileproof rerun      Repeat only prior failed flows
mobileproof coverage   Validate the evidence ledger
mobileproof clean      Remove expired artifacts
```

See the [documentation](docs/index.md), [security model](docs/guide/security.md),
and [architecture](docs/guide/architecture.md).

## Status

`0.1.x` is the implementation preview. Public configuration is versioned, but
the package is not declared 1.0 until both example applications pass the full
cross-platform release gates documented in [ROADMAP.md](ROADMAP.md).
