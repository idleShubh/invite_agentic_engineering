import * as React from "react";
import { cn } from "../../lib/utils";

export function Badge({
  className,
  variant = "secondary",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "secondary" | "outline" }) {
  return <span className={cn("ui-badge", `ui-badge-${variant}`, className)} {...props} />;
}
