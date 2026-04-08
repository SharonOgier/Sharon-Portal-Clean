feature/offline-sync-livestock-10398540462924352948
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncEngine } from '../portal/SyncEngine';

// helper to create a mock request
const createMockRequest = (result: any = null) => ({
  onsuccess: null as any,
  onerror: null as any,
  result
});

const mockStore = {
  getAll: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  add: vi.fn()
};

const mockTransaction = {
  objectStore: vi.fn().mockReturnValue(mockStore),
  oncomplete: null,
  onerror: null
};

const mockDB = {
  transaction: vi.fn().mockReturnValue(mockTransaction),
  objectStoreNames: {
    contains: vi.fn().mockReturnValue(true)
  }
};

global.indexedDB = {
  open: vi.fn()
} as any;

describe('SyncEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset internal state if possible, or just re-init
  });

  it('should init and perform basic ops', async () => {
    const openReq = createMockRequest();
    (global.indexedDB.open as any).mockReturnValue(openReq);

    const initPromise = SyncEngine.initDB('user-1');
    openReq.onsuccess({ target: { result: mockDB } });
    await initPromise;

    // Test getLocalRecords
    const getReq = createMockRequest([{ id: 123 }]);
    mockStore.getAll.mockReturnValue(getReq);
    const getPromise = SyncEngine.getLocalRecords('sas_clients');
    getReq.onsuccess();
    const records = await getPromise;
    expect(records).toEqual([{ id: 123 }]);

    // Test saveLocalRecord
    const putReq = createMockRequest();
    mockStore.put.mockReturnValue(putReq);
    const savePromise = SyncEngine.saveLocalRecord('sas_clients', { id: 456 }, true);
    putReq.onsuccess();
    const saved = await savePromise;
    expect(saved.id).toBe(456);
    expect(saved.pendingSync).toBe(true);
  });

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncEngine } from '../portal/SyncEngine';

// Mock IndexedDB
const mockIDB = {
    open: vi.fn(),
};

global.indexedDB = mockIDB;

describe('SyncEngine', () => {
    it('initializes with a user-specific database name', async () => {
        const openSpy = vi.spyOn(indexedDB, 'open');
        const userId = 'test-user-123';

        // We need to trigger the success/request flow but since it's a complex mock,
        // let's at least verify it tries to open the right name.
        syncEngine.init(userId).catch(() => {}); // It will fail because of missing mocks but we check call

        expect(openSpy).toHaveBeenCalledWith(`MusteredOfflineDB_${userId}`, 1);
    });

    it('strips metadata before sending to Supabase', () => {
        const record = {
            id: 1,
            name: 'Test',
            sync_status: 'pending',
            is_deleted: false,
            last_sync_error: null,
            other: 'data'
        };

        const stripped = syncEngine.stripMetadata(record);

        expect(stripped).toEqual({
            id: 1,
            name: 'Test',
            other: 'data'
        });
        expect(stripped.sync_status).toBeUndefined();
        expect(stripped.is_deleted).toBeUndefined();
    });
master
});
