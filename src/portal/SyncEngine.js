import { SUPABASE_TABLES } from "./PortalHelpers";

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
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        reject(event.target.error);
      };
    });
  },

  async getLocalRecords(tableName) {
    if (!db) throw new Error("Database not initialized");
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([tableName], "readonly");
      const store = transaction.objectStore(tableName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
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
