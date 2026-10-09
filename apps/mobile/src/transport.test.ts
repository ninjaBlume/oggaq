import { expect, it, vi } from "vitest";
import { ApiClient, ApiError } from "@oggaq/api-client";
it("native requests send Bearer credentials and never cookie CSRF", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: { message: "done" } }), {
        status: 200,
      }),
    );
  const client = new ApiClient("https://api.example.test", {
    auth: "bearer",
    accessToken: async () => "synthetic-token",
    fetch: fetcher,
  });
  await client.csrf();
  expect(fetcher).not.toHaveBeenCalled();
  await client.request("post", "/api/v1/auth/logout", {});
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
    credentials: "omit",
    headers: {
      Accept: "application/json",
      Authorization: "Bearer synthetic-token",
    },
  });
  expect(fetcher.mock.calls[0]?.[1]?.headers).not.toHaveProperty(
    "X-XSRF-TOKEN",
  );
});
it("protected 401 expires a native session and exposes the field error structure", async () => {
  const expired = vi.fn();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ detail: "Expired", code: "unauthenticated" }),
        { status: 401 },
      ),
    );
  const client = new ApiClient("https://api.example.test", {
    auth: "bearer",
    accessToken: () => "synthetic",
    fetch: fetcher,
    onSessionExpired: expired,
  });
  await expect(
    client.request("get", "/api/v1/questions", {}),
  ).rejects.toBeInstanceOf(ApiError);
  expect(expired).toHaveBeenCalledOnce();
});
it("a delayed old-token response cannot clear the new account session", async () => {
  let token = "old-synthetic";
  const expired = vi.fn();
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
    token = "new-synthetic";
    return new Response(JSON.stringify({ detail: "Expired" }), { status: 401 });
  });
  const client = new ApiClient("https://api.example.test", {
    auth: "bearer",
    accessToken: () => token,
    fetch: fetcher,
    onSessionExpired: expired,
  });
  await expect(
    client.request("get", "/api/v1/questions", {}),
  ).rejects.toBeInstanceOf(ApiError);
  expect(expired).not.toHaveBeenCalled();
});
