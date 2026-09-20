import * as React from "react";
import { cn } from "@/lib/utils";

export interface BubbleProps extends React.ComponentProps<"div"> {
  variant?: "default" | "primary" | "muted" | "secondary";
}

export function Bubble({
  className,
  variant = "default",
  style,
  ...props
}: BubbleProps) {
  return (
    <div
      data-slot="bubble"
      style={{
        padding: "14px 22px",
        borderRadius: "14px",
        boxSizing: "border-box",
        ...style,
      }}
      className={cn(
        "w-fit max-w-[75%] min-w-0 break-words rounded-[14px] px-5 py-3.5 transition-colors shadow-sm",
        (variant === "default" || variant === "primary") &&
          "bg-[#1d4ed8] text-white dark:bg-[#193cb8] dark:text-white",
        variant === "muted" &&
          "bg-[#f4f4f5] text-[#18181b] dark:bg-[#262626] dark:text-[#fafafa]",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function BubbleContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-content"
      className={cn(
        "text-sm leading-relaxed break-words [overflow-wrap:anywhere]",
        className,
      )}
      {...props}
    />
  );
}

export function BubbleGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-group"
      className={cn(
        "flex flex-col gap-1.5 w-full group-data-[align=end]/message:items-end",
        className,
      )}
      {...props}
    />
  );
}

export default Bubble;
