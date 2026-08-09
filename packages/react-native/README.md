# mobileproof-react-native

This optional package adds stable, noninteractive native markers. It has no
networking, storage, remote-control, fixture, or secret APIs and is safe to
ship in a production bundle.

```tsx
import { ProofReady } from 'mobileproof-react-native';

export function HomeScreen() {
  return <><ProofReady />{/* screen content */}</>;
}
```
