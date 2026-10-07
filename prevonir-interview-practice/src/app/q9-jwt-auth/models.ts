export type Role = 'admin' | 'user';

export interface JwtPayload {
  sub: string; // username
  roles: Role[];
  exp: number; // unix seconds
}

export interface AuthUser {
  username: string;
  roles: Role[];
}
