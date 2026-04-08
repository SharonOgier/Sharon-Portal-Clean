import { SUPABASE_TABLES } from "./PortalHelpers";

<<<<<<< feature/offline-sync-livestock-10398540462924352948
let db = null;
let currentUserId = null;

const DB_VERSION = 1;
const QUEUE_STORE = "offline_queue";

export const SyncEngine = {
  async initDB(userId) {
    if (db && currentUserId === userId) return db;
    currentUserId = userId;
    const dbName = `MusteredOfflineDB_${userId}`;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        // Create stores for each Supabase table
        Object.values(SUPABASE_TABLES).forEach((tableName) => {
          if (!database.objectStoreNames.contains(tableName)) {
            database.createObjectStore(tableName, { keyPath: "id" });
          }
        });

        // Create offline queue store
        if (!database.objectStoreNames.contains(QUEUE_STORE)) {
          database.createObjectStore(QUEUE_STORE, { keyPath: "queueId", autoIncrement: true });
        }
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
=======
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
>>>>>>> master
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        reject(event.target.error);
      };
    });
<<<<<<< feature/offline-sync-livestock-10398540462924352948
  },

  async getLocalRecords(tableName) {
    if (!db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([tableName], "readonly");
=======

    return this.initPromise;
  }

  async getTable(tableName) {
    if (!this.userId) return [];
    await this.init(this.userId);
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([tableName], "readonly");
>>>>>>> master
      const store = transaction.objectStore(tableName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
<<<<<<< feature/offline-sync-livestock-10398540462924352948
  },

  async saveLocalRecord(tableName, record, isPending = false) {
    if (!db) throw new Error("Database not initialized");
    const recordToSave = { ...record, pendingSync: isPending };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([tableName], "readwrite");
      const store = transaction.objectStore(tableName);
      const request = store.put(recordToSave);

      request.onsuccess = () => resolve(recordToSave);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteLocalRecord(tableName, id) {
    if (!db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([tableName], "readwrite");
      const store = transaction.objectStore(tableName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async queueAction(tableName, action, recordId, data) {
    if (!db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE], "readwrite");
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.add({
        tableName,
        action, // 'upsert' | 'delete'
        recordId,
        data,
        timestamp: new Date().toISOString(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getQueue() {
    if (!db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE], "readonly");
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async removeFromQueue(queueId) {
    if (!db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE], "readwrite");
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.delete(queueId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async syncQueue(supabase) {
    const queue = await this.getQueue();
    if (queue.length === 0) return;

    // Sort queue by timestamp to ensure chronological order
    const sortedQueue = [...queue].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    for (const item of sortedQueue) {
      try {
        if (item.action === "upsert") {
          // Conflict resolution: Check if server has newer record
          const { data: serverRecord } = await supabase
            .from(item.tableName)
            .select("id, data, updated_at")
            .eq("id", item.recordId)
            .maybeSingle();

          if (serverRecord && new Date(serverRecord.updated_at) > new Date(item.data.updated_at)) {
            console.warn(`Conflict detected for ${item.tableName}:${item.recordId}. Server version is newer.`);
            // Basic conflict resolution: Skip client change if server is newer
            // In a production app, we would ideally prompt the user or perform a merge
            await this.saveLocalRecord(item.tableName, {
              ...(serverRecord.data || {}),
              id: serverRecord.id,
              updated_at: serverRecord.updated_at
            }, false);
            await this.removeFromQueue(item.queueId);
            continue;
          }

          const row = {
            user_id: currentUserId,
            data: { ...item.data, pendingSync: undefined }, // Don't save the flag to DB
            updated_at: item.data.updated_at || new Date().toISOString()
          };

          // Use Number() if it's a numeric ID, otherwise use as-is
          const numericId = Number(item.recordId);
          if (!isNaN(numericId) && numericId > 10000000) { // Simple check for DB IDs vs temp IDs
             row.id = numericId;
          }

          const { data: savedRow, error } = await supabase
            .from(item.tableName)
            .upsert(row)
            .select("id, data, updated_at")
            .single();

          if (error) throw error;

          // Update local record with final server ID and clear pending flag
          if (savedRow) {
            await this.saveLocalRecord(item.tableName, {
              ...(savedRow.data || {}),
              id: savedRow.id,
              updated_at: savedRow.updated_at
            }, false);
          }
        } else if (item.action === "delete") {
          const { error } = await supabase
            .from(item.tableName)
            .delete()
            .eq("id", item.recordId)
            .eq("user_id", currentUserId);

          if (error) throw error;
        }
        await this.removeFromQueue(item.queueId);
      } catch (error) {
        console.error(`Failed to sync item ${item.queueId}:`, error);
        // If it's a network or connection error, stop processing the queue
        const isNetworkError = error.message?.toLowerCase().includes("network") ||
                              error.message?.toLowerCase().includes("fetch") ||
                              !navigator.onLine;
        if (isNetworkError) break;

        // For other errors (e.g. RLS, Schema), we might want to skip this item so it doesn't block the queue
        // but for now let's just break and investigate.
        break;
      }
    }
  },

  async pullFromServer(tableName, supabase) {
    if (!db) throw new Error("Database not initialized");

    // 1. Get local records to check for pending changes
    const localRecords = await this.getLocalRecords(tableName);
    const pendingIds = new Set(localRecords.filter(r => r.pendingSync).map(r => r.id));

    // 2. Fetch from server
    const { data, error } = await supabase
      .from(tableName)
      .select("id, data, user_id, updated_at")
      .eq("user_id", currentUserId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const remoteRecords = (data || []).map(row => ({
      ...(row.data || {}),
      id: row.id,
      user_id: row.user_id,
      updated_at: row.updated_at
    }));

    // 3. Merge into local DB
    for (const record of remoteRecords) {
      // Don't overwrite local pending changes
      if (!pendingIds.has(record.id)) {
        await this.saveLocalRecord(tableName, record, false);
      }
    }

    return this.getLocalRecords(tableName);
  }
};
=======
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
>>>>>>> master
