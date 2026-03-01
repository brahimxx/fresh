import '@testing-library/jest-dom';

process.env.JWT_SECRET = 'test_secret_32_chars_long_minimum_test';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_stripe_key';

// Optional: Mock Next.js router if needed by React components later
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '',
}));

// Provide basic text encoding globals not present in jsdom
if (typeof global.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util');
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
}
