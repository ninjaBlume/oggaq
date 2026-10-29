import { expect, it } from "vitest";
import { ApiError } from "@oggaq/api-client";
import { connectionReadMessage, errorMessage } from "./feedback";
import { DocumentValidationError } from '@oggaq/study-core';

it('shows approved local validation messages while unexpected errors stay private', () => {
  expect(errorMessage(new DocumentValidationError('Tarihi gg/aa/yyyy biçiminde girin.'))).toBe('Tarihi gg/aa/yyyy biçiminde girin.');
  expect(errorMessage(new Error('private PDF path'))).not.toContain('private PDF path');
});

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


it('offers prepared past exams only for a personal mobile connection failure', () => {
  const offline = new ApiError(0, {});
  expect(connectionReadMessage(offline, false, true)).toContain('cihazda hazır olan sınavları çözebilirsin');
  expect(connectionReadMessage(offline, true, true)).toContain('Son yüklenen bilgiler gösteriliyor');
  expect(connectionReadMessage(offline, false, false)).not.toContain('hazır olan sınavları');
  expect(connectionReadMessage(new ApiError(503, {}), true, true)).not.toContain('hazır olan sınavları');
});
