# Architecture

MobileProof deliberately separates reusable orchestration from project-owned
behavior:

```text
CLI → strict config → device/build adapters → Maestro → application
                  ↘ scenario adapter → local services/public APIs
                  ↘ evidence engine → reports/privacy scan/attestation
```

The UI flow proves user-observable behavior. Scenario adapters establish
deterministic preconditions and inspect postconditions. Project checks retain
fast unit, integration, contract, security, and static evidence. The coverage
ledger combines these layers without pretending UI automation should replace
all other testing.

Every run has a unique ID and finalizer. Services, device locks, and adapters
are cleaned even when a build, flow, or assertion fails.

Flows are independent by default and must not rely on another flow leaving
state behind. Destructive state reset belongs only in flows using an explicit
test application identity; the generated smoke flow preserves existing state.
