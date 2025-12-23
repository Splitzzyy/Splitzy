export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        id: number;
        token: string;
    };
}
export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
}
export interface RegisterResponse {
    success: boolean;
    id?: string;
    message?: string;
}