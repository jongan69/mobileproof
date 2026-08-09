# Offline and process-death testing

Keep offline behavior inside one flow: establish state, disconnect the service
or device network, perform the action, restart or kill the application, restore
connectivity, and wait for the durable result. Assert both visible state and a
server-side exactly-once postcondition through the adapter.
