import { expect, it } from "vitest";
import { ApiError } from "@oggaq/api-client";
import { errorMessage } from "./feedback";

it("shows actionable validation without exception details", () => {
  expect(errorMessage(new ApiError(422, { errors: { duration_seconds: ["Süre 1 ile 180 dakika arasında olmalı."] } }))).toBe("Süre 1 ile 180 dakika arasında olmalı.");
  expect(errorMessage(new Error("private diagnostic"))).not.toContain("private diagnostic");
});
it("does not mistake authorization or rate limits for lost connectivity", () => {
  expect(errorMessage(new ApiError(403, {}))).toContain("erişim iznin yok");
  expect(errorMessage(new ApiError(429, {}))).toContain("Biraz bekleyip");
  expect(errorMessage(new TypeError("Network request failed"))).toContain("İnternet bağlantını");
  expect(errorMessage(new ApiError(409, { detail: "Bu sınav zaten tamamlandı." }))).toBe("Bu sınav zaten tamamlandı.");
});
