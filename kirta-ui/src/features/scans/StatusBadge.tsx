import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScanStatus, SCAN_STATUS_LABEL, type Scan } from "@/types";

export function StatusBadge({ status }: { status: Scan["status"] }) {
  if (status === ScanStatus.Ready) {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        {SCAN_STATUS_LABEL[ScanStatus.Ready]}
      </Badge>
    );
  }
  return (
    <Badge variant="error" className="gap-1">
      <XCircle className="h-3 w-3" />
      {SCAN_STATUS_LABEL[ScanStatus.Error]}
    </Badge>
  );
}
