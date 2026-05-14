import { ScanLine } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Logo } from "./Logo";
import { UserBlock } from "./UserBlock";
import { ScanButton } from "./ScanButton";
import { ThemeToggle } from "@/features/theme";
import { cn } from "@/utils/cn";

interface SidebarProps {
  onNavigate?: () => void;
  onScan?: () => void;
  className?: string;
}

const navItems = [
  { to: "/scans", label: "Сканирования", icon: ScanLine },
];

export function Sidebar({ onNavigate, onScan, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col border-r bg-card/40",
        className,
      )}
    >
      <div className="px-5 pb-2 pt-5">
        <Logo size="lg" lightSrc="/kirta-logo-light.png" darkSrc="/kirta-logo-black.png" />
      </div>

      <div className="px-3 pb-3 pt-3">
        <ScanButton
          className="w-full justify-center"
          onClick={() => {
            onScan?.();
            onNavigate?.();
          }}
        />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
        <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Навигация
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 flex justify-end">
          <ThemeToggle />
        </div>
        <UserBlock />
      </div>
    </aside>
  );
}
