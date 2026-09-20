import React from "react";
import {
  AlignLeft,
  Copy,
  Check,
  Minimize2,
  CheckSquare,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface JsonEditorToolbarProps {
  onFormat?: () => void;
  onMinify?: () => void;
  onValidate?: () => void;
  onCopy?: () => void;
  onSearch?: () => void;
  isCopied?: boolean;
  readOnly?: boolean;
  className?: string;
  isDarkMode?: boolean;
}

export const JsonEditorToolbar: React.FC<JsonEditorToolbarProps> = ({
  onFormat,
  onMinify,
  onValidate,
  onCopy,
  onSearch,
  isCopied = false,
  readOnly = false,
  className,
}) => {
  const btnBaseClass =
    "inline-flex items-center gap-1.5 rounded-xl text-xs font-bold tracking-wide transition-all shadow-sm cursor-pointer select-none bg-[#eaff57] hover:bg-[#ddf83b] text-[#240067]";
  const btnStyle = {
    padding: "8px 16px",
    border: "1px dashed rgba(78, 31, 190, 0.5)",
    outline: "1px dashed rgba(78, 31, 190, 0.8)",
    outlineOffset: "3px",
    borderRadius: "12px",
    boxSizing: "border-box" as const,
  };

  return (
    <div
      data-testid="json-editor-toolbar"
      className={cn(
        "flex flex-nowrap items-center justify-center gap-2",
        className,
      )}
    >
      {onSearch && (
        <button
          type="button"
          onClick={onSearch}
          className={btnBaseClass}
          style={btnStyle}
          title="Search in JSON (Ctrl+F / Cmd+F)"
          aria-label="Search"
        >
          <Search className="size-3.5 opacity-80" />
          <span className="hidden sm:inline">Search</span>
        </button>
      )}

      {!readOnly && onFormat && (
        <button
          type="button"
          onClick={onFormat}
          className={btnBaseClass}
          style={btnStyle}
          title="Prettify and format JSON"
          aria-label="Format JSON"
        >
          <AlignLeft className="size-3.5 opacity-80" />
          <span>Format</span>
        </button>
      )}

      {!readOnly && onMinify && (
        <button
          type="button"
          onClick={onMinify}
          className={btnBaseClass}
          style={btnStyle}
          title="Minify JSON (compact whitespace)"
          aria-label="Minify JSON"
        >
          <Minimize2 className="size-3.5 opacity-80" />
          <span>Minify</span>
        </button>
      )}

      {onValidate && (
        <button
          type="button"
          onClick={onValidate}
          className={btnBaseClass}
          style={btnStyle}
          title="Validate JSON Schema syntax"
          aria-label="Validate JSON"
        >
          <CheckSquare className="size-3.5 opacity-80" />
          <span>Validate</span>
        </button>
      )}

      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className={btnBaseClass}
          style={btnStyle}
          title="Copy JSON to clipboard"
          aria-label="Copy JSON"
        >
          {isCopied ? (
            <>
              <Check className="size-3.5 text-[#240067]" />
              <span className="text-[#240067] font-bold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5 opacity-80" />
              <span>Copy</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
