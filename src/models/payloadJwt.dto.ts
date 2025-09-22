export interface TokenPayload {
    id: string;
    role: string;
    username: string;
    password?: string;
    action?: string;
    businessRegistrationNumber?: string;
}