const JWT_SECRET = process.env.JWT_SECRET;

export function getJwtSecret(): string {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set. Application cannot start.');
    }
    return JWT_SECRET;
}
