import { createToolHandler, defineToolSet } from "@fastgpt-plugin/sdk-factory";
import { getIssue, listAlertRules, listIssueEvents, listIssues, listReleases } from "./src/operations";
import {
  getIssueInputSchema,
  getIssueOutputSchema,
  listAlertRulesInputSchema,
  listAlertRulesOutputSchema,
  listIssueEventsInputSchema,
  listIssueEventsOutputSchema,
  listIssuesInputSchema,
  listIssuesOutputSchema,
  listReleasesInputSchema,
  listReleasesOutputSchema,
  secretSchema,
  type SentrySecrets,
} from "./src/schemas";

function requireSecrets(secrets: SentrySecrets | undefined): SentrySecrets {
  if (!secrets?.baseUrl?.trim() || !secrets.authToken?.trim()) {
    throw new Error("Sentry baseUrl and authToken secrets are required");
  }
  return secrets;
}

const listIssuesHandler = createToolHandler({
  inputSchema: listIssuesInputSchema,
  outputSchema: listIssuesOutputSchema,
  secretSchema,
  handler: async (input, ctx) => listIssues({ ...input, ...requireSecrets(ctx.secrets) }),
});

const getIssueHandler = createToolHandler({
  inputSchema: getIssueInputSchema,
  outputSchema: getIssueOutputSchema,
  secretSchema,
  handler: async (input, ctx) => getIssue({ ...input, ...requireSecrets(ctx.secrets) }),
});

const listIssueEventsHandler = createToolHandler({
  inputSchema: listIssueEventsInputSchema,
  outputSchema: listIssueEventsOutputSchema,
  secretSchema,
  handler: async (input, ctx) => listIssueEvents({ ...input, ...requireSecrets(ctx.secrets) }),
});

const listReleasesHandler = createToolHandler({
  inputSchema: listReleasesInputSchema,
  outputSchema: listReleasesOutputSchema,
  secretSchema,
  handler: async (input, ctx) => listReleases({ ...input, ...requireSecrets(ctx.secrets) }),
});

const listAlertRulesHandler = createToolHandler({
  inputSchema: listAlertRulesInputSchema,
  outputSchema: listAlertRulesOutputSchema,
  secretSchema,
  handler: async (input, ctx) => listAlertRules({ ...input, ...requireSecrets(ctx.secrets) }),
});

export default defineToolSet({
  manifest: {
    pluginId: "sentry",
    name: { en: "Sentry", "zh-CN": "Sentry" },
    description: {
      en: "Query Sentry issues, error events, releases, and alert rules.",
      "zh-CN": "查询 Sentry 错误、事件、Release 和告警规则。",
    },
    version: "0.1.0",
    versionDescription: {
      en: "Initial read-only Sentry operations for incident investigation and alert workflows.",
      "zh-CN": "初始只读能力，用于故障排查和告警工作流。",
    },
    toolDescription:
      "Use a Sentry organization and project to inspect issues, their error events, releases, and alert rules. Results are normalized without exposing the auth token.",
    tutorialUrl: "https://docs.sentry.io/api/",
    tags: ["tools", "productivity"],
    permission: [],
  },
  secretSchema,
  children: [
    {
      id: "listIssues",
      name: { en: "List Issues", "zh-CN": "查询问题" },
      description: { en: "List and filter Sentry issues.", "zh-CN": "列出并筛选 Sentry 问题。" },
      toolDescription: "List unresolved or filtered Sentry issues for an organization, optionally scoped to a project.",
      handler: listIssuesHandler,
    },
    {
      id: "getIssue",
      name: { en: "Get Issue", "zh-CN": "读取问题" },
      description: { en: "Read one Sentry issue.", "zh-CN": "读取一个 Sentry 问题。" },
      toolDescription: "Retrieve one Sentry issue by its numeric issue ID.",
      handler: getIssueHandler,
    },
    {
      id: "listIssueEvents",
      name: { en: "List Issue Events", "zh-CN": "查询问题事件" },
      description: { en: "List error events for an issue.", "zh-CN": "列出问题对应的错误事件。" },
      toolDescription: "Inspect recent error events attached to a Sentry issue.",
      handler: listIssueEventsHandler,
    },
    {
      id: "listReleases",
      name: { en: "List Releases", "zh-CN": "查询 Release" },
      description: { en: "List organization releases.", "zh-CN": "列出组织的 Release。" },
      toolDescription: "List releases and optionally filter them by project or release version query.",
      handler: listReleasesHandler,
    },
    {
      id: "listAlertRules",
      name: { en: "List Alert Rules", "zh-CN": "查询告警规则" },
      description: { en: "List Sentry alert rules.", "zh-CN": "列出 Sentry 告警规则。" },
      toolDescription: "Read alert rules so an agent can explain configured incident notifications and route follow-up actions.",
      handler: listAlertRulesHandler,
    },
  ],
});
