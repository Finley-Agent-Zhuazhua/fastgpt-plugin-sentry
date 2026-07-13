import type { InputSchemaMetaType, OutputSchemaMetaType, SecretSchemaMetaType } from "@fastgpt-plugin/sdk-factory";
import z from "zod";

const text = (title: string, description: string, max = 2048) =>
  z.string().min(1).max(max).meta({ title, description, toolDescription: description } satisfies InputSchemaMetaType);

const slug = (title: string, description: string) =>
  text(title, description, 200).regex(/^[A-Za-z0-9][A-Za-z0-9_.-]*$/, "must contain only letters, numbers, dots, underscores, or hyphens");

const limit = z.number().int().min(1).max(100).default(25).meta({
  title: "Limit",
  description: "Maximum number of records to return (1-100).",
  toolDescription: "Maximum records to return.",
} satisfies InputSchemaMetaType);

const cursor = z.string().min(1).max(512).optional().meta({
  title: "Cursor",
  description: "Optional Sentry pagination cursor from a previous response.",
  toolDescription: "Pagination cursor.",
} satisfies InputSchemaMetaType);

export const secretSchema = z.object({
  baseUrl: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password && !url.search && !url.hash;
    }, "baseUrl must be an HTTP(S) URL without embedded credentials, query parameters, or fragments")
    .meta({
      title: "Sentry Base URL",
      description: "Sentry server URL, for example https://sentry.io or a self-hosted Sentry URL.",
      isSecret: false,
    } satisfies SecretSchemaMetaType),
  authToken: z
    .string()
    .min(1)
    .max(512)
    .meta({
      title: "Sentry Auth Token",
      description: "Sentry API auth token with read access to the organization and projects used by this plugin.",
      isSecret: true,
    } satisfies SecretSchemaMetaType),
});

export const listIssuesInputSchema = z.object({
  organization: slug("Organization", "Sentry organization slug.").meta({ title: "Organization", description: "Sentry organization slug." } satisfies InputSchemaMetaType),
  project: slug("Project", "Optional Sentry project slug.").optional(),
  query: text("Query", "Optional Sentry issue search query, for example is:unresolved or timeout.", 1000).optional(),
  environment: slug("Environment", "Optional Sentry environment name.").optional(),
  statsPeriod: z.enum(["1h", "24h", "7d", "14d", "30d", "90d"]).optional().meta({
    title: "Stats Period",
    description: "Optional period used for issue event statistics.",
    toolDescription: "Issue statistics period.",
  } satisfies InputSchemaMetaType),
  limit,
  cursor,
});

export const getIssueInputSchema = z.object({
  issueId: text("Issue ID", "Numeric Sentry issue ID.", 64).regex(/^\d+$/, "must be a numeric Sentry issue ID"),
});

export const listIssueEventsInputSchema = z.object({ issueId: text("Issue ID", "Numeric Sentry issue ID.", 64).regex(/^\d+$/, "must be a numeric Sentry issue ID"), limit, cursor });

export const listReleasesInputSchema = z.object({
  organization: slug("Organization", "Sentry organization slug."),
  project: slug("Project", "Optional Sentry project slug.").optional(),
  query: text("Query", "Optional release version or name query.", 1000).optional(),
  limit,
  cursor,
});

export const listAlertRulesInputSchema = z.object({
  organization: slug("Organization", "Sentry organization slug."),
  project: slug("Project", "Optional Sentry project slug.").optional(),
  limit,
  cursor,
});

const success = z.literal(true).meta({ title: "Success" } satisfies OutputSchemaMetaType);
const object = z.record(z.string(), z.unknown());
const listOutput = z.object({ success, items: z.array(object), nextCursor: z.string().optional() });

export const listIssuesOutputSchema = listOutput;
export const listIssueEventsOutputSchema = listOutput;
export const listReleasesOutputSchema = listOutput;
export const listAlertRulesOutputSchema = listOutput;
export const getIssueOutputSchema = z.object({ success, issue: object });

export type SentrySecrets = z.output<typeof secretSchema>;
export type ListIssuesInput = z.output<typeof listIssuesInputSchema>;
export type GetIssueInput = z.output<typeof getIssueInputSchema>;
export type ListIssueEventsInput = z.output<typeof listIssueEventsInputSchema>;
export type ListReleasesInput = z.output<typeof listReleasesInputSchema>;
export type ListAlertRulesInput = z.output<typeof listAlertRulesInputSchema>;
export type ListOutput = z.output<typeof listOutput>;
export type GetIssueOutput = z.output<typeof getIssueOutputSchema>;
