module.exports = {
    jwtVerify: jest.fn(() => Promise.resolve({ payload: { role: 'client', id: 1 } })),
    SignJWT: jest.fn(),
    importJWK: jest.fn(),
};
