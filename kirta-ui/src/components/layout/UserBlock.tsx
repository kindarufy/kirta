import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/features/auth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";

interface UserBlockProps {
  className?: string;
}

export function UserBlock({ className }: UserBlockProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const initials = user.displayName.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card/60 px-2 py-2 pr-3 shadow-sm",
        className,
      )}
    >
      <Avatar className="h-9 w-9 ring-2 ring-primary/40">
        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-blue-500 text-white">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-medium">{user.displayName}</span>
        <span className="truncate text-[11px] text-muted-foreground">@{user.username}</span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 rounded-full"
            aria-label="Выйти"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Выйти</TooltipContent>
      </Tooltip>
    </div>
  );
}
