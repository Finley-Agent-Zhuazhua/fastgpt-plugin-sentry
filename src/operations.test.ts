import { afterEach, describe, expect, it, vi } from "vitest";
import { nextCursor } from "./client";
import { getIssue, listAlertRules, listIssueEvents, listIssues, listReleases } from "./operations";
import { secretSchema } from "./schemas";

const secrets = { baseUrl: "https://sentry.example.test", authToken: "unit-test-token" };
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

afterEach(() => vi.restoreAllMocks());

describe("schemas", () => {
  it("requires a safe HTTP(S) base URL and token", () => {
    expect(() => secretSchema.parse({ baseUrl: "https://user:pass@sentry.example.test", authToken: "token" })).toThrow(/credentials/);
    expect(() => secretSchema.parse({ baseUrl: "ftp://sentry.example.test", authToken: "token" })).toThrow();
    expect(() => secretSchema.parse({ baseUrl: "https://sentry.example.test", authToken: "" })).toThrow();
  });
});

describe("Sentry operations", () => {
  it("constructs an issue query, uses bearer auth, and reads the next cursor", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(json([{ id: "42", title: "Timeout" }], 200, { Link: '<https://sentry.example.test/api/0/organizations/acme/issues/>; rel="next"; results="true"; cursor="next:1:0"' }));
    await expect(listIssues({ ...secrets, organization: "acme", project: "web-app", query: "is:unresolved", environment: "production", statsPeriod: "24h", limit: 10 })).resolves.toEqual({ success: true, items: [{ id: "42", title: "Timeout" }], nextCursor: "next:1:0" });
    const [url, init] = fetchMock.mock.calls[0]!;
    const parsed = new URL(String(url));
    expect(parsed.pathname).toBe("/api/0/organizations/acme/issues/");
    expect(parsed.searchParams.get("project")).toBe("web-app");
    expect(parsed.searchParams.get("query")).toBe("is:unresolved");
    expect(parsed.searchParams.get("statsPeriod")).toBe("24h");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer unit-test-token", Accept: "application/json" });
  });

  it("retrieves an issue and lists events, releases, and alert rules", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json({ id: "42", title: "Timeout", status: "unresolved" }))
      .mockResolvedValueOnce(json([{ eventID: "abc", message: "timeout" }]))
      .mockResolvedValueOnce(json([{ version: "2026.07.13" }]))
      .mockResolvedValueOnce(json([{ name: "High error rate" }]));
    await expect(getIssue({ ...secrets, issueId: "42" })).resolves.toEqual({ success: true, issue: { id: "42", title: "Timeout", status: "unresolved" } });
    await expect(listIssueEvents({ ...secrets, issueId: "42", limit: 5 })).resolves.toMatchObject({ success: true, items: [{ eventID: "abc" }] });
    await expect(listReleases({ ...secrets, organization: "acme", project: "web-app", limit: 5 })).resolves.toMatchObject({ success: true, items: [{ version: "2026.07.13" }] });
    await expect(listAlertRules({ ...secrets, organization: "acme", project: "web-app", limit: 5 })).resolves.toMatchObject({ success: true, items: [{ name: "High error rate" }] });
    const paths = fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname);
    expect(paths).toEqual([
      "/api/0/issues/42/",
      "/api/0/issues/42/events/",
      "/api/0/organizations/acme/releases/",
      "/api/0/organizations/acme/alert-rules/",
    ]);
  });

  it("reports API errors, malformed JSON, and malformed list items", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json({ detail: "permission denied" }, 403))
      .mockResolvedValueOnce(new Response("not-json", { status: 502 }))
      .mockResolvedValueOnce(json(["not-an-object"]));
    await expect(getIssue({ ...secrets, issueId: "42" })).rejects.toThrow(/permission denied/);
    await expect(getIssue({ ...secrets, issueId: "42" })).rejects.toThrow(/Invalid JSON/);
    await expect(listIssues({ ...secrets, organization: "acme", limit: 5 })).rejects.toThrow(/issues item must be an object/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns no cursor unless Sentry advertises a next page", () => {
    expect(nextCursor(new Headers())).toBeUndefined();
    expect(nextCursor(new Headers({ Link: '<https://example.test>; rel="next"; results="false"; cursor="ignored"' }))).toBeUndefined();
  });
});
