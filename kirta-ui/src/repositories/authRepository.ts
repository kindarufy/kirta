import { AuthError, type AuthUser } from "@/types";

export interface AuthRepository {
  login(params: { username: string; password: string }): Promise<AuthUser>;
}

class MockAuthRepository implements AuthRepository {
  async login(params: { username: string; password: string }): Promise<AuthUser> {
    await new Promise((r) => setTimeout(r, 350));
    const username = params.username.trim();
    const password = params.password.trim();

    // Mock auth for local UI work: accept any non-empty credentials.
    if (username.length > 0 && password.length > 0) {
      return {
        username,
        displayName: username,
      };
    }
    throw new AuthError("invalid_credentials", "Неверный логин или пароль");
  }
}

export const authRepository: AuthRepository = new MockAuthRepository();
