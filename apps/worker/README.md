# Worker application boundary (reserved)

The TypeScript entrypoint is non-running. There are no jobs, credentials or queues.
Future workers must verify trusted scope and idempotency, rather than trust payload-supplied tenant IDs.
