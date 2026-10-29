import { describe, expect, it } from "vitest";
import type { StudyContext, User } from "@oggaq/shared-types";
import { OfflineIdentityStore } from "./identity";
import shippedTemplates from "./document-templates.json";
import serverTemplates from "../../../../backend/resources/document-templates.json";

const user: User = { id: "student-one", name: "Örnek Öğrenci", email: "student@example.test", email_verified_at: null, platform_role: "student", pending_email: null };
const personal: StudyContext = { id: "personal-one", kind: "personal", tenant_id: null, membership_id: null, name: "Kişisel", role: null };
const tenant: StudyContext = { id: "company-one", kind: "tenant", tenant_id: "company-one", membership_id: "membership-one", name: "Kurum", role: "student" };

function setup() {
  let data: string | null = null;
  const store = new OfflineIdentityStore({ read: async () => data, write: async value => { data = value; }, remove: async () => { data = null; } },
    async token => token === "session-one" ? "digest-one" : "digest-two");
  return { store, raw: () => data, corrupt: (value: string) => { data = value; } };
}

describe("offline identity", () => {
  it("restores only the same session's personal context and never stores its token", async () => {
    const { store, raw } = setup();
    await store.save("session-one", user, [tenant, personal]);
    expect(raw()).not.toContain("session-one");
    expect(await store.read("session-one")).toEqual({ user, contexts: [personal] });
    expect(await store.read("session-two")).toBeNull();
    expect(await store.read(null)).toBeNull();
    await store.clear();
    expect(await store.read("session-one")).toBeNull();
  });
  it("does not grant a tenant context offline or trust damaged saved data", async () => {
    const { store, corrupt } = setup();
    await store.save("session-one", user, [tenant]);
    expect(await store.read("session-one")).toBeNull();
    corrupt("{");
    expect(await store.read("session-one")).toBeNull();
    corrupt(JSON.stringify({ version: 1, sessionDigest: "digest-one", user, context: tenant }));
    expect(await store.read("session-one")).toBeNull();
  });
  it("waits for an in-flight save before clearing the snapshot at logout", async () => {
    let value: string | null = null;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const store = new OfflineIdentityStore({ read: async () => value, write: async data => { await gate; value = data; }, remove: async () => { value = null; } }, async () => "digest-one");
    const saving = store.save("session-one", user, [personal]);
    const clearing = store.clear();
    release();
    await Promise.all([saving, clearing]);
    expect(value).toBeNull();
    expect(await store.read("session-one")).toBeNull();
  });
  it("bundles the same document templates that the server provides", () => {
    expect(shippedTemplates).toEqual(serverTemplates);
  });
});
