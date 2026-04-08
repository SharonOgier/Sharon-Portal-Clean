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
});
