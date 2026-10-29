import { DocumentValidationError } from '@oggaq/study-core';
import { ApiError } from "@oggaq/api-client";

// Keep server validation actionable, distinguish access/rate limits from connectivity,
// and never display unexpected exception details in the interface.
export function errorMessage(error: unknown): string {
  if (error instanceof DocumentValidationError) return error.message;
  if (error instanceof ApiError) {
    if (error.status === 422) return Object.values(error.problem.errors ?? {}).flat()[0] ?? error.message;
    if (error.status === 403) return "Bu işlem için erişim iznin yok. Hesabının erişim yetkilerini kontrol et.";
    if (error.status === 429) return "Kısa sürede çok fazla istek gönderildi. Biraz bekleyip yeniden dene.";
    return error.message;
  }
  if (error instanceof TypeError) return "Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip yeniden dene.";
  return "Beklenmeyen bir sorun oluştu. Yeniden deneyebilirsin.";
}

/** A personal native session may use only previously prepared past exams. */
export function connectionReadMessage(error: unknown, retained: boolean, offlineHint: boolean): string {
  const offline = error instanceof TypeError || (error instanceof ApiError && error.status === 0);
  const prefix = retained ? 'Son yüklenen bilgiler gösteriliyor. ' : '';
  if (offlineHint && offline) return `${prefix}Deneme ve Ders Sınavları bölümünde cihazda hazır olan sınavları çözebilirsin.`;
  return retained ? `${prefix}Bağlantını kontrol edip yeniden deneyebilirsin.` : errorMessage(error);
}
