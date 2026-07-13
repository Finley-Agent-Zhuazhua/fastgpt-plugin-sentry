# Sentry for FastGPT

FastGPT tool suite for read-only Sentry incident investigation and alert workflows.

## Tools

- **List Issues**: query organization issues with Sentry search syntax, project, environment, and statistics period filters.
- **Get Issue**: read one issue by numeric ID.
- **List Issue Events**: inspect recent error events attached to an issue.
- **List Releases**: query organization releases, optionally scoped to a project.
- **List Alert Rules**: inspect alert rules so an agent can explain the configured notification and incident routing setup.

All operations are read-only. Sentry pagination cursors returned in the `Link` header are exposed as `nextCursor` for a follow-up call.

## Secrets

Configure these FastGPT secrets:

- `baseUrl`: Sentry server URL such as `https://sentry.io` or a self-hosted Sentry URL. Do not include credentials, query parameters, or fragments.
- `authToken`: Sentry API token. Use the smallest read-only scopes needed by your organization and projects, such as organization/project/event read access. The token is sent only in the `Authorization: Bearer` header and is never included in tool output.

Inputs use organization and project slugs. Issue IDs must be numeric Sentry issue IDs.

## Local verification

```bash
corepack pnpm install
corepack pnpm test
corepack pnpm type-check
corepack pnpm build
corepack pnpm check
corepack pnpm pack
```

Tests mock Sentry responses and cover request construction, authorization headers, pagination parsing, response normalization, API errors, malformed JSON, and malformed list items. No live Sentry credential integration test was performed.
