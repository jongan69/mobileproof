# Scenario adapters

Set `adapter: e2e/mobileproof/adapter.mjs` and export an object with
`apiVersion: 1`. Optional hooks are `prepare`, `seed`, `assert`, and `cleanup`.

Adapters receive safe command execution, an artifact directory, device and
platform metadata, and secret registration. Return scenario variables for
Maestro without committing credentials to YAML.

Use direct database writes only to establish preconditions. The operation
being verified must travel through the application or a public interface. For
multi-user apps, build a deterministic actor that performs the second user's
real protocol/API actions.

Adapters execute with the developer's permissions and must be reviewed like
source code. MobileProof never loads an adapter from a URL.
