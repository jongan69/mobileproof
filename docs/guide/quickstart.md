# Quickstart

## Requirements

- Node.js 22 or newer.
- Java 17 or newer.
- Maestro CLI.
- Android SDK/ADB for Android.
- macOS and Xcode for iOS Simulator.

Install MobileProof in the application repository:

```bash
npm install --save-dev mobileproof
npx mobileproof init --ready-id app.ready
```

`init` detects Expo or bare React Native, npm/Yarn/pnpm/Bun, application IDs,
and target platforms. It creates `mobileproof.yaml`, an isolated E2E folder,
and a capability ledger. Existing files are not overwritten unless `--force`
is explicitly passed. Use `--dry-run` to preview the complete change.

Add the readiness ID to the first usable screen. The optional marker package
provides a safe marker:

```tsx
import { ProofReady } from 'mobileproof-react-native';

export function Home() {
  return <><ProofReady />{/* content */}</>;
}
```

Then run:

```bash
npx mobileproof doctor
npx mobileproof run smoke --platform android
```

`mobileproof toolchain install` can install the reviewed Maestro release into
the MobileProof cache. Set the printed `MOBILEPROOF_MAESTRO` path for shells or
CI jobs that do not add it to `PATH`.

Pass `--device <adb-serial-or-simulator-udid>` when multiple devices exist.
Projects on an external SSD work without special handling; all relative paths
are resolved from the configuration file rather than the user's home folder.
