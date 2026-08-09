# Continuous integration

The CLI is CI-provider independent. A job needs Node, Java, Maestro, a native
toolchain, and a simulator/emulator or attached device.

Recommended policy:

- Pull requests: package checks and Android smoke.
- Main: Android and iOS critical suites.
- Nightly: supported OS/device matrix.
- Release: strict suite from a clean source snapshot, with retained JUnit and
  MobileProof artifacts.

Use `actions/setup/action.yml` for the Node/pnpm layer and the reusable workflow
templates in `.github/workflows`. Pin third-party actions by commit SHA.

Never expose production credentials to pull requests from forks. Use isolated
test accounts and environments whose data can be deleted by run ID.
