import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/features/theme";
import { useAuth } from "@/features/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isPending, error, clearError } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/scans";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const ok = await login(username.trim(), password);
    if (ok) {
      navigate(from, {
        replace: true,
        state: from === "/scans" ? { fromLogin: true } : null,
      });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 px-3 py-6 sm:px-4">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.18),transparent)]" />

      <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size="lg" lightSrc="/kirta-logo-light.png" darkSrc="/kirta-logo-black.png" />
          <div>
            <p className="text-sm text-muted-foreground">
              Платформа анализа дефектов безопасности — SAST, DAST, SCA
            </p>
          </div>
        </div>

        <Card className="border-border/60 shadow-xl">
          <CardContent className="p-5 sm:p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="username">Логин</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="parker"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    clearError();
                  }}
                  disabled={isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError();
                  }}
                  disabled={isPending}
                  required
                />
              </div>

              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Войти
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Демо-учетная запись: <span className="font-mono text-foreground">parker / parker</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
