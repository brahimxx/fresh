/**
 * @jest-environment node
 */
import { DELETE as deleteResource } from '@/app/api/resources/[resourceId]/route';
import * as db from '@/lib/db';
import * as auth from '@/lib/auth';

jest.mock('@/lib/db', () => ({
    query: jest.fn(),
    getOne: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
    requireAuth: jest.fn(),
}));

describe('Soft Delete Rules', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('must perform an UPDATE is_active = 0 instead of a hard DELETE FROM', async () => {
        // Mock authentication
        auth.requireAuth.mockResolvedValue({ userId: 1, role: 'owner' });

        // Mock resource ownership check
        db.getOne.mockResolvedValue({ id: 99, salon_id: 1, owner_id: 1 });

        const request = new Request('http://localhost:3000/api/resources/99', { method: 'DELETE' });

        await deleteResource(request, { params: { resourceId: '99' } });

        // Assert that the database query was an UPDATE, NOT a DELETE
        expect(db.query).toHaveBeenCalledWith(
            'UPDATE resources SET is_active = 0 WHERE id = ?',
            ['99']
        );

        // Explicitly assert that no hard delete was attempted
        expect(db.query).not.toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM'),
            expect.anything()
        );
    });
});
