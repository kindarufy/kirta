import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-5xl font-semibold tracking-tight">404</h1>
      <p className="max-w-md text-muted-foreground">
        Страница не найдена. Возможно, она была перемещена или удалена.
      </p>
      <Button asChild>
        <Link to="/scans">На главную</Link>
      </Button>
    </div>
  );
}
