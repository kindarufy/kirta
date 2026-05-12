import { Menu, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

interface MobileTopBarProps {
  onMenuOpen: () => void;
  onScan: () => void;
}

export function MobileTopBar({ onMenuOpen, onScan }: MobileTopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onMenuOpen}
        aria-label="Открыть меню"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Logo size="md" />
      <div className="ml-auto">
        <Button
          type="button"
          size="pill"
          onClick={onScan}
          className="h-10 gap-1.5 px-3 shadow-md shadow-primary/30 sm:px-5"
        >
          <ScanLine className="h-4 w-4" />
          <span className="hidden sm:inline">Просканировать</span>
        </Button>
      </div>
    </header>
  );
}
