# Artifacts and attestations

Every run produces summary JSON/HTML, JUnit, an environment record, coverage
result, rerun command, per-flow Maestro output, and an unsigned local
attestation.

The attestation binds verification level to source hash, configuration hash,
commit, platforms, completion time, and expiry. CI may sign it through Sigstore;
local output always states `signed: false`.

Artifacts default to `.mobileproof/artifacts` and expire locally after 14 days.
Review privacy findings before sharing any bundle.
