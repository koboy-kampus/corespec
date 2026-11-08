import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES } from "@/lib/categories";

/** One badge summing up a build: incompatible, warnings, incomplete or compatible. */
export function BuildStatus({
  errors,
  warnings,
  filled,
}: {
  errors: number;
  warnings: number;
  filled: number;
}) {
  if (errors > 0)
    return (
      <Badge variant="error" icon={<XCircle />}>
        {errors} incompatible
      </Badge>
    );
  if (warnings > 0)
    return (
      <Badge variant="warn" icon={<AlertTriangle />}>
        {warnings} {warnings === 1 ? "warning" : "warnings"}
      </Badge>
    );
  if (filled < CATEGORIES.length)
    return (
      <Badge variant="neutral" icon={<CircleDashed />}>
        Incomplete
      </Badge>
    );
  return (
    <Badge variant="ok" icon={<CheckCircle2 />}>
      Compatible
    </Badge>
  );
}
