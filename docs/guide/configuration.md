# Configuration

`mobileproof.yaml` is strict and versioned. Unknown fields fail early. Paths
are relative to the configuration file unless documented otherwise.

Use argument arrays for commands:

```yaml
checks:
  - id: unit
    command:
      argv: [npm, test]
      timeoutMs: 120000
```

This avoids platform-dependent shell quoting and accidental command expansion.
Environment values use `${NAME}` and fail if the variable is missing. Secrets
must come from the environment and should be registered in `redaction`.

Monorepos set `workspaceRoot` to the package-manager root and `appRoot` to the
application package. Individual command `cwd` values can target other packages.

See the [field reference](../reference/config.md).
