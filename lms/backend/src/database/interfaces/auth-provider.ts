export interface AuthUser {
  uid: string;
  email?: string;
  displayName?: string;
  role?: string;
}

export interface AuthProvider {
  verifyToken(idToken: string): Promise<AuthUser>;
  createUser(properties: { email: string; password?: string; displayName?: string }): Promise<AuthUser>;
  getUser(uid: string): Promise<AuthUser>;
  deleteUser(uid: string): Promise<void>;
}
