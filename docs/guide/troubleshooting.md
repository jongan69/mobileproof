# Troubleshooting

Run `mobileproof doctor` before debugging a flow. It distinguishes toolchain,
device, project, and application-ID failures.

On a test failure, open `.mobileproof/artifacts/<run-id>/summary.html`, then use
the exact command in `rerun.txt`. Flow directories contain Maestro's JUnit,
screenshots, logs, and hierarchy output when available.

Common causes:

- No `maestro` executable: install it and ensure the same shell can find it.
- Android is `unauthorized`: unlock the phone and approve USB debugging.
- No iOS device: boot a Simulator or keep `booted-or-create` configured.
- Readiness timeout: inspect the native hierarchy and use a stable `testID`.
- Release build differs: run the release profile; do not rely on Expo Go.
- External drive permission: confirm the terminal has access to the mounted
  volume and configure the artifact directory on a writable filesystem.
