import type { GetIssueInput, ListAlertRulesInput, ListIssueEventsInput, ListIssuesInput, ListReleasesInput, SentrySecrets } from "./schemas";

type JsonObject = Record<string, unknown>;
type ResponseData = { payload: unknown; headers: Headers; status: number };

export class SentryClient {
  private readonly baseUrl: URL;

  constructor(
    secrets: SentrySecrets,
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    this.baseUrl = normalizeBaseUrl(secrets.baseUrl);
    if (!secrets.authToken.trim()) throw new Error("Sentry authToken secret is required");
    this.authToken = secrets.authToken;
  }

  private readonly authToken: string;

  listIssues(input: ListIssuesInput) {
    return this.requestList(["organizations", input.organization, "issues"], {
      project: input.project,
      query: input.query,
      environment: input.environment,
      statsPeriod: input.statsPeriod,
      limit: String(input.limit),
      cursor: input.cursor,
    });
  }

  getIssue(input: GetIssueInput) {
    return this.request(["issues", input.issueId]);
  }

  listIssueEvents(input: ListIssueEventsInput) {
    return this.requestList(["issues", input.issueId, "events"], { limit: String(input.limit), cursor: input.cursor });
  }

  listReleases(input: ListReleasesInput) {
    return this.requestList(["organizations", input.organization, "releases"], {
      project: input.project,
      query: input.query,
      limit: String(input.limit),
      cursor: input.cursor,
    });
  }

  listAlertRules(input: ListAlertRulesInput) {
    return this.requestList(["organizations", input.organization, "alert-rules"], {
      project: input.project,
      limit: String(input.limit),
      cursor: input.cursor,
    });
  }

  private async requestList(path: string[], params: Record<string, string | undefined>) {
    const response = await this.request(path, params);
    if (!Array.isArray(response.payload)) throw new Error(`Sentry ${path.join("/")} returned an invalid list response`);
    return response;
  }

  private async request(path: string[], params: Record<string, string | undefined> = {}): Promise<ResponseData> {
    const url = new URL(`${path.map(encodeURIComponent).join("/")}/`, this.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, value);
    }
    const response = await this.fetchFn(url, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${this.authToken}` },
    });
    const payload = await parseJson(response, url.pathname);
    if (!response.ok) throw new Error(`Sentry GET ${url.pathname} failed: ${errorMessage(payload, response.statusText)}`);
    return { payload, headers: response.headers, status: response.status };
  }
}

export function normalizeBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Sentry baseUrl must be a valid HTTP(S) URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Sentry baseUrl must use HTTP or HTTPS");
  if (url.username || url.password || url.search || url.hash) throw new Error("Sentry baseUrl must not contain credentials, query parameters, or fragments");
  const pathname = url.pathname.replace(/\/+$/, "");
  url.pathname = pathname.endsWith("/api/0") ? `${pathname}/` : `${pathname}/api/0/`;
  return url;
}

export function nextCursor(headers: Headers): string | undefined {
  const link = headers.get("link") ?? "";
  const nextLink = link.split(",").find((part) => /rel=["']next["']/.test(part) && /results=["']true["']/.test(part));
  const attributeCursor = nextLink?.match(/cursor=["']([^"']+)["']/)?.[1];
  if (attributeCursor) return attributeCursor;
  const urlValue = nextLink?.match(/<([^>]+)>/)?.[1];
  if (!urlValue) return undefined;
  try {
    return new URL(urlValue).searchParams.get("cursor") ?? undefined;
  } catch {
    return undefined;
  }
}

async function parseJson(response: Response, path: string): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Invalid JSON from Sentry ${path}`);
  }
}

function errorMessage(value: unknown, fallback: string) {
  if (value && typeof value === "object") {
    const record = value as JsonObject;
    for (const key of ["detail", "message", "error"]) {
      if (typeof record[key] === "string" && record[key]) return record[key] as string;
    }
  }
  return fallback || "request failed";
}
