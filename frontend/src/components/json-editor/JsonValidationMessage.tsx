import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface JsonValidationMessageProps {
  isValid: boolean;
  error?: {
    message: string;
    line?: number;
    column?: number;
  } | null;
  className?: string;
}

export const JsonValidationMessage: React.FC<JsonValidationMessageProps> = ({
  isValid,
  error,
  className,
}) => {
  if (isValid && !error) {
    return (
      <div
        data-testid="json-validation-valid"
        className={cn(
          "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all",
          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
          className,
        )}
      >
        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
        <span className="font-semibold tracking-wide">Valid JSON</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="json-validation-error"
        role="alert"
        className={cn(
          "flex items-start gap-2.5 px-3.5 py-2 rounded-lg text-xs font-mono transition-all",
          "bg-rose-500/10 text-rose-300 border border-rose-500/25 shadow-xs",
          className,
        )}
      >
        <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-rose-400 uppercase tracking-wider text-[10px]">
              Invalid JSON
            </span>
            {error.line !== undefined && (
              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-200 text-[10px] font-bold">
                Line {error.line}
                {error.column !== undefined ? `:${error.column}` : ""}
              </span>
            )}
          </div>
          <span className="text-[11px] leading-tight text-rose-200/90 break-words">
            {error.message}
          </span>
        </div>
      </div>
    );
  }

  return null;
};
