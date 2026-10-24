import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { legalPages, legalUrl, notOfficialNotice, scoreEstimateNotice } from "./legal";

const publicDir = new URL("../../../apps/web/public/legal/", import.meta.url);
describe("legal pages", () => {
  it("builds absolute addresses without doubling slashes", () => {
    expect(legalUrl("https://example.test", "gizlilik")).toBe("https://example.test/legal/gizlilik.html");
    expect(legalUrl("https://example.test/", "hesap-silme")).toBe("https://example.test/legal/hesap-silme.html");
    expect(() => legalUrl("https://example.test", "yok" as never)).toThrow();
  });
  it.each(legalPages)("$id has a static file under apps/web/public", (page) => {
    const file = new URL(page.file.replace("/legal/", ""), publicDir);
    expect(existsSync(file)).toBe(true);
    const html = readFileSync(file, "utf8");
    // The shared wording lives in the page too, so the apps and the store listing say the same thing.
    expect(html).toContain(notOfficialNotice);
    expect(html).toContain('id="taslak-bandi"');
    for (const other of legalPages) expect(html).toContain(`href="${other.file}"`);
  });
  it("keeps the score note in the terms and support pages", () => {
    for (const id of ["kosullar", "destek"] as const) {
      expect(readFileSync(new URL(`${id}.html`, publicDir), "utf8")).toContain(scoreEstimateNotice);
    }
  });
});
