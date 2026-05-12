import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/features/theme";
import { QueryProvider } from "./providers";
import { AppRouter } from "./router";

export function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider delayDuration={150}>
          <AppRouter />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
