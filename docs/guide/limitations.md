# Limitations

MobileProof verifies declared behavior; it cannot infer every business rule in
an arbitrary application.

Local iOS Simulator cannot prove real camera, microphone, APNs, physical
biometric, cellular, App Store delivery, or real purchase behavior. Connected
Android can cover more hardware behavior, but store delivery and production
vendor operations still require dedicated sandbox or release evidence.

Large load, disaster recovery, legal review, production moderation staffing,
and app-store review are operational gates rather than local UI flows. Record
them as explicit external evidence; do not silently mark them automated.
