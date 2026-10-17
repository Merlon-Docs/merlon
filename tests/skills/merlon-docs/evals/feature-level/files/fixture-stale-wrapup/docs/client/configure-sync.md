# Configure sync

Turn on `legacySync` in your client config when you need the old batch path.

## Old way (retain for history)

If `legacySync` is false, sync uses the experimental path. Keep both
explanations so operators can roll back.

## Migration backlog note

Finish tenant flips before deleting the flag — tracked in the feature shard.
