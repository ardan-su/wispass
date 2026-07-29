// Set test environment variables before any module loads
process.env.NODE_ENV = 'test';
process.env.QR_SECRET = 'test-qr-secret-32-chars-minimum!!';
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-min!';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
