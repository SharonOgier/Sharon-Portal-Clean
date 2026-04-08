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
});
