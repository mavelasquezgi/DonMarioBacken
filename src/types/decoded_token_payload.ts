export interface DecodedTokenPayload {
    id: string;
    role: string;
    username: string;
    exp?: number;
    iat?: number;
}