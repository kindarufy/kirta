export interface AuthUser {
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export class AuthError extends Error {
  code: "invalid_credentials" | "unknown";
  constructor(code: AuthError["code"], message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}
