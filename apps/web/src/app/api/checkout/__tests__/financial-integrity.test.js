import { calculateBookingTotal } from '@/lib/checkout';
import * as db from '@/lib/db';

jest.mock('@/lib/db', () => ({
    query: jest.fn(),
    getOne: jest.fn(),
}));

describe('Financial Integrity Rules', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('must ignore malicious frontend pricing arrays and aggregate purely from DB rows', async () => {
        // Malicious request payload
        const maliciousPayload = {
            bookingId: 999,
            services: [{ id: 1, name: 'Haircut', price: 1.00 }], // Spoofed to $1
            products: [],
            clientTotal: 1.00 // Spoofed total
        };

        // The backend's real truth
        // The backend's real truth
        const mockConnection = {
            query: jest.fn((sql) => {
                if (sql.includes('SELECT COALESCE(SUM(price), 0) AS total FROM booking_services')) {
                    return [[{ total: 100.00 }]]; // The real database price
                }
                if (sql.includes('SELECT COALESCE(SUM(total_price), 0) AS total FROM booking_products')) {
                    return [[{ total: 0 }]];
                }
                if (sql.includes('SELECT COALESCE(SUM(amount_saved), 0) AS total FROM booking_discounts')) {
                    return [[{ total: 0 }]];
                }
                if (sql.includes('SELECT COALESCE(SUM(amount_used), 0) AS total FROM booking_gift_cards')) {
                    return [[{ total: 0 }]];
                }
                return [[{ total: 0 }]];
            })
        };

        const breakdown = await calculateBookingTotal(maliciousPayload.bookingId, mockConnection);

        // The checkout function MUST calculate $100 based on the DB, ignoring the $1 payload
        expect(breakdown.servicesTotal).toBe(100.00);
        expect(breakdown.finalTotal).toBe(100.00);

        // Ensure that it actively executed a DB query to fetch the real prices rather than relying on inputs
        expect(mockConnection.query).toHaveBeenCalledWith(
            expect.stringContaining('booking_services'),
            expect.any(Array)
        );
    });
});
