import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { reportNoteLimit, reportReasonLabel, reportReasons, vocabulary } from "./index";

describe("question report vocabulary", () => {
  it("offers exactly the reasons the API accepts", () => {
    const api = JSON.parse(readFileSync(new URL("../../../docs/openapi.json", import.meta.url), "utf8"));
    expect(reportReasons.map((reason) => reason.value)).toEqual(api.components.schemas.QuestionReportReason.enum);
    expect(reportNoteLimit).toBe(api.components.schemas.QuestionReportInput.properties.note.maxLength);
  });
  it("labels a reason and falls back to the code for an unknown one", () => {
    expect(reportReasonLabel("typo")).toBe("Yazım veya dil hatası");
    expect(reportReasonLabel("surprise")).toBe("surprise");
  });
  it("names the admin queue", () => {
    expect(vocabulary.reports.title).toBe("Bildirimler");
  });
});
