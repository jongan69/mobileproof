# CLI reference

- `init`: detect and scaffold; supports `--root`, `--ready-id`, `--dry-run`, and `--force`.
- `doctor`: validate prerequisites; supports `--config` and `--platform`.
- `inspect`: print resolved roots, suites, and devices as JSON.
- `run [suite]`: execute; supports `--platform`, `--device`, `--skip-build`, and `--strict`.
- `build [profile]`: build and install a configured profile on one device.
- `install <artifact>`: install an APK or iOS Simulator `.app`.
- `rerun <run-id>`: rerun only failed flows from an earlier result.
- `coverage check`: validate every evidence reference before execution.
- `attest [run-id]`: print the selected run's artifact-bound attestation.
- `artifacts open [run-id]`: open the local HTML report.
- `clean`: remove expired artifacts; `--all` removes every run.
- `toolchain install`: install the checksum-pinned Maestro release.
- `migrate maestro`: adopt existing Maestro flows without rewriting them.

Exit categories are stable: test 2, configuration 3, toolchain 4, device 5,
build 6, environment 7, coverage 8, privacy 9, and unexpected internal 1.
