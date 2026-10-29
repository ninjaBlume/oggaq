import { openDatabaseAsync } from "expo-sqlite";
import { OfflineDatabase, type SqlDatabase } from "./database";

const databaseName = "oggsor-offline.db";
let opening: Promise<OfflineDatabase> | undefined;

/** Separate connections set foreign keys before BEGIN; only the callback owns its write transaction. */
export function openOfflineDatabase(): Promise<OfflineDatabase> {
  if (!opening) opening = (async () => {
    const connection = await openDatabaseAsync(databaseName);
    const adapter: SqlDatabase = {
      execAsync: sql => connection.execAsync(sql),
      runAsync: (sql, ...params) => connection.runAsync(sql, ...params),
      getFirstAsync: <T>(sql: string, ...params: (string | number | null)[]) => connection.getFirstAsync<T>(sql, ...params),
      getAllAsync: <T>(sql: string, ...params: (string | number | null)[]) => connection.getAllAsync<T>(sql, ...params),
      withExclusiveTransactionAsync: async action => {
        const tx = await openDatabaseAsync(databaseName, { useNewConnection: true });
        let began = false;
        try {
          await tx.execAsync("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE;");
          began = true;
          await action(tx);
          await tx.execAsync("COMMIT;");
          began = false;
        } catch (error) {
          if (began) {
            try { await tx.execAsync("ROLLBACK;"); }
            catch { console.warn("Çevrimdışı işlem geri alınamadı."); }
          }
          throw error;
        } finally { await tx.closeAsync(); }
      },
    };
    const database = new OfflineDatabase(adapter);
    await database.initialize();
    return database;
  })().catch(error => { opening = undefined; throw error; });
  return opening;
}
