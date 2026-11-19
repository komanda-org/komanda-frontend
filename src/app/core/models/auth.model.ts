/**
 * Contract for POST /auth/login, mirroring the back-end (komanda-api) DTO.
 */
export interface LoginPayload {
  email: string;
  password: string;
}

/** Mirrors the back-end's Role enum (Prisma). */
export type UserRole = 'PROFISSIONAL' | 'RESTAURANTE';

export interface AuthUser {
  id: string;
  role: UserRole;
  email?: string;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}
