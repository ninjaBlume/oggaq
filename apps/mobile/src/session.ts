export interface Session {
  token: string;
  expiresAt: string;
}
export interface SessionStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  remove(): Promise<void>;
}
export class SessionStore {
  private current: Session | null = null;
  constructor(private readonly storage: SessionStorage) {}
  get token(): string | null {
    return this.current?.token ?? null;
  }
  async restore(): Promise<boolean> {
    const value = await this.storage.read();
    if (!value) return false;
    try {
      const parsed: unknown = JSON.parse(value);
      if (!validSession(parsed) || Date.parse(parsed.expiresAt) <= Date.now()) {
        await this.clear();
        return false;
      }
      this.current = parsed;
      return true;
    } catch {
      await this.clear();
      return false;
    }
  }
  async save(session: Session): Promise<void> {
    if (!validSession(session)) throw new Error("Geçersiz oturum yanıtı.");
    await this.storage.write(JSON.stringify(session));
    this.current = session;
  }
  async clear(): Promise<void> {
    this.current = null;
    await this.storage.remove();
  }
}
function validSession(value: unknown): value is Session {
  if (
    typeof value !== "object" ||
    value === null ||
    !("token" in value) ||
    !("expiresAt" in value)
  )
    return false;
  return (
    typeof value.token === "string" &&
    value.token.length > 0 &&
    typeof value.expiresAt === "string" &&
    Number.isFinite(Date.parse(value.expiresAt))
  );
}
export function validateApiUrl(value: string, development: boolean): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash)
    throw new Error("API adresi kullanıcı bilgisi, sorgu veya fragment içeremez.");
  if (url.protocol !== "https:" && !(development && url.protocol === "http:"))
    throw new Error("Uygulama için HTTPS API adresi gerekli.");
  return url.origin + url.pathname.replace(/\/+$/, "");
}
