# Postman

## Files

| File                                                         | Role                                                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `Lucid-Web-Craftsman.postman_collection.json`                | Generated collection — **do not hand-edit** for contract changes; change Edge Functions / OpenAPI inputs and regenerate.       |
| `Lucid-Web-Craftsman.postman_environment.json`               | Example environment variables (safe defaults).                                                                                 |
| `Lucid-Web-Craftsman.local.postman_environment.example.json` | Template for **local secrets** — copy to `Lucid-Web-Craftsman.local.postman_environment.json` (gitignored) and fill real keys. |

Postman Desktop may create `.postman/` or `postman/postman/` here; those paths are gitignored.

## Regenerate the collection

From the repository root:

```bash
pnpm run postman:collection
```

Drift check:

```bash
pnpm run postman:collection:check
```

Regenerate OpenAPI + Postman together:

```bash
pnpm run api:artifacts
```

**Documentation:** [STANDARDS.md — API artifacts](../docs/STANDARDS.md) · [Documentation index](../docs/README.md).
