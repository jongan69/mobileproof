# Security and privacy

MobileProof is a local code-execution tool. Project checks, service commands,
and adapters run with the invoking user's privileges. Review configuration and
adapter changes before execution.

Security defaults:

- No telemetry or automatic artifact upload.
- No shell interpretation for command arrays.
- No remote adapter loading.
- Secrets originate in the environment and are redacted from text artifacts.
- Known authorization, JWT, private-key, and project-defined patterns are
  scanned before strict verification succeeds.
- Production application state reset is prohibited by policy and should use a
  separate E2E application identifier.

Privacy scanning is defense in depth, not permission to place real customer
data in tests. Use generated identities and isolated test environments.
