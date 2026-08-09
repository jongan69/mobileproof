# Stable selectors

Use stable `testID` identifiers for screens, primary actions, and meaningful
states. Do not use coordinates, translated text, personal data, generated
database IDs, or animation timing as the primary selector.

Recommended vocabulary:

```text
app.ready
screen.onboarding.ready
onboarding.continue
screen.home.ready
navigation.settings
message.composer
message.send
```

Keep accessibility labels human-readable and localized. Test IDs are a
separate nonlocalized contract. Every screen should expose one readiness
marker, and every configured journey should wait for it with a bounded timeout.
