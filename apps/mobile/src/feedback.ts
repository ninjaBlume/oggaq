import { ApiError } from "@oggaq/api-client";

// Keep server validation actionable, distinguish access/rate limits from connectivity,
// and never display unexpected exception details in the interface.
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 422) return Object.values(error.problem.errors ?? {}).flat()[0] ?? error.message;
    if (error.status === 403) return "Bu işlem için erişim iznin yok. Seçili çalışma alanını kontrol et.";
    if (error.status === 429) return "Kısa sürede çok fazla istek gönderildi. Biraz bekleyip yeniden dene.";
    return error.message;
  }
  if (error instanceof TypeError) return "Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip yeniden dene.";
  return "Beklenmeyen bir sorun oluştu. Yeniden deneyebilirsin.";
}
