import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface ScanButtonProps {
  onClick?: () => void;
  className?: string;
}

export function ScanButton({ onClick, className }: ScanButtonProps) {
  return (
    <Button
      type="button"
      size="pill"
      onClick={onClick}
      className={cn(
        "shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40",
        className,
      )}
    >
      <ScanLine className="h-4 w-4" />
      Просканировать
    </Button>
  );
}
