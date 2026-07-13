import { nextCursor, SentryClient } from "./client";
import type {
  GetIssueInput,
  GetIssueOutput,
  ListAlertRulesInput,
  ListIssueEventsInput,
  ListIssuesInput,
  ListOutput,
  ListReleasesInput,
  SentrySecrets,
} from "./schemas";

type WithSecrets<T> = T & SentrySecrets;

type ListResponse = { payload: unknown; headers: Headers };

export async function listIssues(input: WithSecrets<ListIssuesInput>): Promise<ListOutput> {
  return toListOutput(new SentryClient(input).listIssues(input), "issues");
}

export async function getIssue(input: WithSecrets<GetIssueInput>): Promise<GetIssueOutput> {
  const response = await new SentryClient(input).getIssue(input);
  return { success: true, issue: asObject(response.payload, "issue") };
}

export async function listIssueEvents(input: WithSecrets<ListIssueEventsInput>): Promise<ListOutput> {
  return toListOutput(new SentryClient(input).listIssueEvents(input), "issue events");
}

export async function listReleases(input: WithSecrets<ListReleasesInput>): Promise<ListOutput> {
  return toListOutput(new SentryClient(input).listReleases(input), "releases");
}

export async function listAlertRules(input: WithSecrets<ListAlertRulesInput>): Promise<ListOutput> {
  return toListOutput(new SentryClient(input).listAlertRules(input), "alert rules");
}

function toListOutput(responsePromise: Promise<ListResponse>, kind: string): Promise<ListOutput> {
  return responsePromise.then((response) => {
    if (!Array.isArray(response.payload)) throw new Error(`Sentry ${kind} response must be an array`);
    const cursor = nextCursor(response.headers);
    return {
      success: true,
      items: response.payload.map((value) => asObject(value, `${kind} item`)),
      ...(cursor ? { nextCursor: cursor } : {}),
    };
  });
}

function asObject(value: unknown, kind: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Sentry ${kind} must be an object`);
  return value as Record<string, unknown>;
}
