import { findOrCreateClient } from '@/lib/client';
import * as db from '@/lib/db';

jest.mock('@/lib/db', () => ({
    __esModule: true,
    default: {
        getConnection: jest.fn(),
        execute: jest.fn()
    },
    pool: {
        getConnection: jest.fn(),
        execute: jest.fn()
    },
    transaction: jest.fn(),
    query: jest.fn()
}));

describe('Client Deduplication Rules', () => {
    let mockConnection;

    beforeEach(() => {
        jest.clearAllMocks();

        mockConnection = {
            query: jest.fn(),
            execute: jest.fn().mockResolvedValue([[]]),
            beginTransaction: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn(),
        };

        db.default.getConnection.mockResolvedValue(mockConnection);
    });

    it('must recover from ER_DUP_ENTRY and resolve to the existing user', async () => {
        const querySequence = mockConnection.execute;

        // 1. Initial lookup by phone fails (simulating a race condition window)
        querySequence.mockImplementationOnce(() => [[]]);

        // 2. Fallback lookup by email fails (the race condition window)
        querySequence.mockImplementationOnce(() => [[]]);

        // 3. The INSERT fails because another thread just inserted the email
        querySequence.mockImplementationOnce(() => {
            const error = new Error('Duplicate entry');
            error.code = 'ER_DUP_ENTRY';
            throw error;
        });

        // 4. The fallback SELECT recovers the user that the other thread inserted
        querySequence.mockImplementationOnce(() => {
            return [[{ id: 999 }]]; // The recovered duplicate ID
        });

        // 5. salon_clients insertion succeeds normally
        querySequence.mockImplementationOnce(() => [{}]);

        const clientData = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.race@example.com',
            phone: '+1234567890',
            salonId: 1
        };

        const result = await findOrCreateClient(clientData);

        // The function must successfully resolve to ID 999 despite the INSERT failing in the middle
        expect(result.userId).toBe(999);

        // It must still commit the transaction for the salon_clients relation
        expect(mockConnection.commit).toHaveBeenCalled();
    });
});
