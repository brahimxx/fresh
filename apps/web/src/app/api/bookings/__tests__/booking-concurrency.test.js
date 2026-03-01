import { createSafeBooking } from '@/lib/booking';
import * as db from '@/lib/db';

// Mock the database pool and connections
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

describe('Booking Concurrency Rules', () => {
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

    it('must use SELECT ... FOR UPDATE to lock the staff row', async () => {
        // Setup pool.execute mock for static working hours check and service auth before transaction
        db.default.execute.mockImplementation(async (sql) => {
            if (sql.includes('working_hours')) {
                return [[{ day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', is_working: 1 }]];
            }
            if (sql.includes('service_staff')) {
                return [[{ staff_id: 1, service_id: 1 }]];
            }
            return [[]];
        });

        // Setup a successful staff lock mock inside the transaction
        mockConnection.query.mockImplementation((sql) => {
            if (sql.includes('SELECT * FROM staff WHERE id = ? FOR UPDATE')) {
                return [[{ id: 1, salon_id: 1, is_active: 1 }]];
            }
            if (sql.includes('SELECT * FROM staff_working_hours')) {
                return [[{ day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', is_working: 1 }]];
            }
            if (sql.includes('SELECT COUNT(*)')) { // Time off check
                return [[{ is_off: 0 }]];
            }
            if (sql.includes('FROM bookings b JOIN booking_services')) { // Existing bookings
                return [[]]; // No overlaps
            }
            if (sql.includes('INSERT INTO bookings')) {
                return [{ insertId: 100 }];
            }
            if (sql.includes('INSERT INTO booking_services')) {
                return [{}];
            }
            if (sql.includes('INSERT INTO salon_clients')) {
                return [{}];
            }
            return [[]];
        });

        const bookingPayload = {
            salonId: 1,
            primaryStaffId: 1,
            clientId: 1,
            startDatetime: '2026-06-15 10:00:00',
            services: [{ serviceId: 1, duration: 60, price: 50 }],
        };

        try {
            await createSafeBooking(bookingPayload);
        } catch (err) {
            console.error("DEBUG ERROR MSG:", err.message);
            throw err;
        }

        // Assert that the FOR UPDATE row lock was executed exactly as required by the business rules
        expect(mockConnection.execute).toHaveBeenCalledWith(
            expect.stringContaining('SELECT b.id'),
            expect.arrayContaining([bookingPayload.primaryStaffId])
        );
        expect(mockConnection.execute).toHaveBeenCalledWith(
            expect.stringContaining('FOR UPDATE'),
            expect.any(Array)
        );
    });

    it('must roll back and release connection if FOR UPDATE fails', async () => {
        db.default.execute.mockImplementation(async (sql) => {
            if (sql.includes('working_hours')) {
                return [[{ day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', is_working: 1 }]];
            }
            if (sql.includes('service_staff')) {
                return [[{ staff_id: 1, service_id: 1 }]];
            }
            return [[]];
        });

        mockConnection.execute.mockImplementation((sql) => {
            if (sql.includes('SELECT b.id')) {
                throw new Error('Lock wait timeout exceeded'); // Simulate a MySQL lock collision
            }
            return [[]];
        });

        const bookingPayload = {
            salonId: 1,
            primaryStaffId: 1,
            clientId: 1,
            startDatetime: '2026-06-15 10:00:00',
            services: [{ serviceId: 1, duration: 60, price: 50 }],
        };

        // The function should throw the database error
        await expect(createSafeBooking(bookingPayload)).rejects.toThrow('Lock wait timeout exceeded');

        // It must still clean up the database state
        expect(mockConnection.rollback).toHaveBeenCalled();
        expect(mockConnection.release).toHaveBeenCalled();
    });
});
