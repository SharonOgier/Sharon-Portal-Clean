import { SUPABASE_TABLES } from "./PortalHelpers";

const DB_NAME = "MusteredOfflineDB";
const DB_VERSION = 1;

class SyncEngine {
  constructor() {
    this.db = null;
    this.initPromise = null;
    this.userId = null;
  }

  async init(userId) {
    if (!userId) {
      console.warn("SyncEngine init called without userId");
    }

    const dbName = userId ? `${DB_NAME}_${userId}` : DB_NAME;

    if (this.db && this.db.name === dbName) return this.db;
    if (this.initPromise && this.currentDbName === dbName) return this.initPromise;

    this.currentDbName = dbName;
    this.userId = userId;
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        Object.values(SUPABASE_TABLES).forEach((tableName) => {
          if (!db.objectStoreNames.contains(tableName)) {
            // We use 'id' as the key. For new records created offline,
            // we'll generate a temporary unique ID.
            db.createObjectStore(tableName, { keyPath: "id" });
          }
        });
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        reject(event.target.error);
      };
    });

    return this.initPromise;
  }

  async getTable(tableName) {
    if (!this.userId) return [];
    await this.init(this.userId);
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([tableName], "readonly");
      const store = transaction.objectStore(tableName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveLocal(tableName, data, syncStatus = "pending") {
    if (!this.userId) throw new Error("SyncEngine not initialized with userId");
    await this.init(this.userId);
    const record = {
      ...data,
      sync_status: syncStatus,
      updated_at: data.updated_at || new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([tableName], "readwrite");
      const store = transaction.objectStore(tableName);
      const request = store.put(record);

      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteLocal(tableName, id) {
    if (!this.userId) throw new Error("SyncEngine not initialized with userId");
    await this.init(this.userId);
    // Instead of actual deletion, we mark it as deleted so we can sync the deletion to Supabase
    const records = await this.getTable(tableName);
    const existing = records.find(r => String(r.id) === String(id));

    if (existing) {
      existing.is_deleted = true;
      existing.sync_status = "pending";
      existing.updated_at = new Date().toISOString();
      return this.saveLocal(tableName, existing);
    } else {
      // If it doesn't exist locally, nothing to do
      return Promise.resolve();
    }
  }

  async markSynced(tableName, id, finalData = null) {
    if (!this.userId) throw new Error("SyncEngine not initialized with userId");
    await this.init(this.userId);
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([tableName], "readwrite");
      const store = transaction.objectStore(tableName);

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (!record) {
            resolve();
            return;
        }

        if (record.is_deleted && !finalData) {
            // If it was marked for deletion and successfully deleted remotely, remove from IDB
            const delRequest = store.delete(id);
            delRequest.onsuccess = () => resolve();
            delRequest.onerror = () => reject(delRequest.error);
        } else {
            // If ID changed (temporary ID replaced by DB ID), delete old and put new
            if (finalData && String(finalData.id) !== String(id)) {
                store.delete(id);
            }

            const updatedRecord = {
                ...(finalData || record),
                sync_status: "synced",
                last_sync_error: null
            };
            const putRequest = store.put(updatedRecord);
            putRequest.onsuccess = () => resolve(updatedRecord);
            putRequest.onerror = () => reject(putRequest.error);
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async markConflict(tableName, id, errorMsg) {
    if (!this.userId) throw new Error("SyncEngine not initialized with userId");
    await this.init(this.userId);
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([tableName], "readwrite");
      const store = transaction.objectStore(tableName);
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.sync_status = "conflict";
          record.last_sync_error = errorMsg;
          store.put(record);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getPending(tableName) {
    const all = await this.getTable(tableName);
    return all.filter(r => r.sync_status === "pending");
  }

  async syncTable(tableName, supabase, fallbackUserId) {
    if (!supabase) return;

    const pending = await this.getPending(tableName);
    for (const record of pending) {
      const recordUserId = record.user_id || fallbackUserId;
      if (!recordUserId) continue;

      try {
        if (record.is_deleted) {
          // Attempt remote delete
          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq("id", record.id)
            .eq("user_id", recordUserId);

          if (error) throw error;
          await this.markSynced(tableName, record.id);
        } else {
          // Attempt remote upsert
          // We need to fetch remote first for conflict detection
          const isTempId = typeof record.id === 'string' || (typeof record.id === 'number' && record.id % 1 !== 0);

          if (!isTempId) {
            const { data: remoteData, error: fetchError } = await supabase
                .from(tableName)
                .select("updated_at")
                .eq("id", record.id)
                .maybeSingle();

            if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

            if (remoteData && new Date(remoteData.updated_at) > new Date(record.updated_at)) {
                await this.markConflict(tableName, record.id, "Remote version is newer");
                continue;
            }
          }

          const row = {
            user_id: recordUserId,
            data: this.stripMetadata(record),
            updated_at: record.updated_at
          };

          // Only send ID if it's not a temporary one
          if (!isTempId) {
              row.id = record.id;
          }

          const { data: savedData, error: upsertError } = await supabase
            .from(tableName)
            .upsert(row, { onConflict: "id" })
            .select("id, data, user_id, updated_at")
            .single();

          if (upsertError) throw upsertError;

          const finalRecord = {
              ...(savedData.data || {}),
              id: savedData.id,
              user_id: savedData.user_id,
              updated_at: savedData.updated_at
          };
          await this.markSynced(tableName, record.id, finalRecord);
        }
      } catch (err) {
        console.error(`Sync failed for ${tableName} record ${record.id}:`, err);
        // We don't mark as error here, it stays pending for retry
      }
    }
  }

  stripMetadata(record) {
    const { sync_status, last_sync_error, is_deleted, ...rest } = record;
    return rest;
  }

  async syncAll(supabase, authUserId) {
    const tables = Object.values(SUPABASE_TABLES);
    for (const table of tables) {
      await this.syncTable(table, supabase, authUserId);
    }
  }
}

export const syncEngine = new SyncEngine();
