# ADR 0001: Maestro is the default UI driver

Maestro provides one readable flow language across iOS and Android, can target
local simulators/emulators and physical devices, and emits CI-friendly output.
MobileProof wraps it rather than forking it. Project checks and scenario
adapters cover evidence that does not belong in UI automation.
