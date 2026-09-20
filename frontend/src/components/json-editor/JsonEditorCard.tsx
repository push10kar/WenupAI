import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type * as monacoType from "monaco-editor";
import { cn } from "@/lib/utils";
import { JsonEditorToolbar } from "./JsonEditorToolbar";
import { JsonValidationMessage } from "./JsonValidationMessage";

export interface JsonError {
  message: string;
  line?: number;
  column?: number;
}

export interface JsonEditorCardProps {
  /**
   * Legacy header labels retained for caller compatibility; they are no longer rendered.
   */
  title?: string;
  subtitle?: string;
  /**
   * Initial or controlled JSON schema/data object or string.
   */
  initialData?: unknown;
  /**
   * Raw JSON string if passing text directly.
   */
  value?: string;
  /**
   * Callback fired when valid or invalid JSON content changes.
   */
  onChange?: (updatedJsonString: string, parsedValue: unknown | null) => void;
  /**
   * Read-only mode flag.
   */
  readOnly?: boolean;
  /**
   * Custom height for the editor container.
   */
  height?: string;
  /**
   * Whether to display toolbar buttons (Format, Minify, Validate, Copy, Search). Defaults to true.
   */
  showToolbar?: boolean;
  /**
   * Whether to display the inline validation status message. Defaults to true.
   */
  showValidation?: boolean;
  /**
   * Whether to show the Minify button in the toolbar. Defaults to true.
   */
  showMinify?: boolean;
  /**
   * Whether dark mode styling is active. Defaults to true.
   */
  isDarkMode?: boolean;
  /**
   * Optional custom container class name.
   */
  className?: string;
  /**
   * Optional test ID for container.
   */
  "data-testid"?: string;
}

/**
 * Parses JSON error to extract accurate line and column numbers.
 */
function parseJsonError(err: unknown, text: string): JsonError {
  const message = err instanceof Error ? err.message : String(err);

  // Chrome/V8: "Unexpected token X in JSON at position 42"
  const positionMatch = message.match(/at position (\d+)/i);
  if (positionMatch) {
    const pos = parseInt(positionMatch[1], 10);
    const beforePos = text.slice(0, pos);
    const lines = beforePos.split("\n");
    return {
      message,
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
    };
  }

  // Firefox/Safari: "JSON.parse: unexpected character at line 3 column 5 of the JSON data"
  const lineColMatch = message.match(/line (\d+) column (\d+)/i);
  if (lineColMatch) {
    return {
      message,
      line: parseInt(lineColMatch[1], 10),
      column: parseInt(lineColMatch[2], 10),
    };
  }

  // Fallback: search syntax error location
  return { message };
}

export const JsonEditorCard: React.FC<JsonEditorCardProps> = ({
  initialData,
  value: controlledValue,
  onChange,
  readOnly = false,
  height = "100%",
  showToolbar = true,
  showValidation = true,
  showMinify = true,
  isDarkMode = true,
  className,
  "data-testid": testId = "json-editor-card",
}) => {
  // Compute initial string
  const formatInitial = useCallback(() => {
    if (controlledValue !== undefined) return controlledValue;
    if (initialData !== undefined) {
      return typeof initialData === "string"
        ? initialData
        : JSON.stringify(initialData, null, 2);
    }
    return "{\n\n}";
  }, [controlledValue, initialData]);

  const [code, setCode] = useState<string>(formatInitial);
  const [isCopied, setIsCopied] = useState(false);
  const [validationError, setValidationError] = useState<JsonError | null>(
    null,
  );
  const [isValid, setIsValid] = useState<boolean>(true);

  const editorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const monacoRef = useRef<typeof monacoType | null>(null);

  // Sync external changes
  useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== code) {
      setCode(controlledValue);
      validateJsonString(controlledValue);
    } else if (initialData !== undefined && controlledValue === undefined) {
      const formatted =
        typeof initialData === "string"
          ? initialData
          : JSON.stringify(initialData, null, 2);
      if (formatted !== code) {
        setCode(formatted);
        validateJsonString(formatted);
      }
    }
  }, [controlledValue, typeof initialData === "object" ? JSON.stringify(initialData) : initialData]);

  const validateJsonString = (text: string): boolean => {
    try {
      if (!text.trim()) {
        setValidationError(null);
        setIsValid(true);
        return true;
      }
      JSON.parse(text);
      setValidationError(null);
      setIsValid(true);
      return true;
    } catch (err) {
      const parsed = parseJsonError(err, text);
      setValidationError(parsed);
      setIsValid(false);
      return false;
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    const updated = value ?? "";
    setCode(updated);

    let parsed: unknown = null;
    let valid = false;
    try {
      if (updated.trim()) {
        parsed = JSON.parse(updated);
      }
      setValidationError(null);
      setIsValid(true);
      valid = true;
    } catch (err) {
      const errorDetail = parseJsonError(err, updated);
      setValidationError(errorDetail);
      setIsValid(false);
      valid = false;
    }

    if (onChange) {
      onChange(updated, valid ? parsed : null);
    }
  };

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction("editor.action.formatDocument")?.run();
    } else {
      try {
        const parsed = JSON.parse(code);
        const pretty = JSON.stringify(parsed, null, 2);
        setCode(pretty);
        setValidationError(null);
        setIsValid(true);
        onChange?.(pretty, parsed);
      } catch (err) {
        setValidationError(parseJsonError(err, code));
        setIsValid(false);
      }
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(code);
      const minified = JSON.stringify(parsed);
      setCode(minified);
      setValidationError(null);
      setIsValid(true);
      onChange?.(minified, parsed);
      if (editorRef.current) {
        editorRef.current.setValue(minified);
      }
    } catch (err) {
      setValidationError(parseJsonError(err, code));
      setIsValid(false);
    }
  };

  const handleValidate = () => {
    validateJsonString(code);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSearch = () => {
    if (editorRef.current) {
      editorRef.current.getAction("actions.find")?.run();
    }
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define custom Wenup / Aura dark theme matching pixel-perfect branding
    monaco.editor.defineTheme("aura-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "string.key.json", foreground: "e25cf6", fontStyle: "bold" },
        { token: "string.value.json", foreground: "4ade80" },
        { token: "number", foreground: "38bdf8" },
        { token: "keyword.json", foreground: "f59e0b" }, // booleans
        { token: "delimiter.bracket.json", foreground: "8e7ea5" },
        { token: "delimiter.array.json", foreground: "8e7ea5" },
        { token: "delimiter.colon.json", foreground: "8e7ea5" },
        { token: "delimiter.comma.json", foreground: "8e7ea5" },
      ],
      colors: {
        "editor.background": "#1a0933",
        "editor.foreground": "#ffffff",
        "editorLineNumber.foreground": "#5c437e",
        "editorLineNumber.activeForeground": "#cdbdff",
        "editorCursor.foreground": "#cdbdff",
        "editor.selectionBackground": "#3c159a60",
        "editor.inactiveSelectionBackground": "#280e4d",
        "editorGutter.background": "#1a0933",
        "editorIndentGuide.background1": "#38146e",
        "editorIndentGuide.activeBackground1": "#6d28d9",
      },
    });

    // Define light theme
    monaco.editor.defineTheme("aura-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "string.key.json", foreground: "6b21a8", fontStyle: "bold" },
        { token: "string.value.json", foreground: "15803d" },
        { token: "number", foreground: "0284c7" },
        { token: "keyword.json", foreground: "b45309" },
        { token: "delimiter.bracket.json", foreground: "4b5563" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#1d1a23",
        "editorLineNumber.foreground": "#9ca3af",
        "editorLineNumber.activeForeground": "#4E1FBE",
        "editorGutter.background": "#ffffff",
      },
    });

    monaco.editor.setTheme(isDarkMode ? "aura-dark" : "aura-light");
  };

  return (
    <div
      data-testid={testId}
      className={cn(
        "flex flex-col h-full w-full rounded-2xl overflow-hidden transition-all duration-200 select-text",
        isDarkMode ? "bg-[#1a0933] text-white" : "bg-white text-[#1d1a23]",
        className,
      )}
      style={{
        boxSizing: "border-box",
      }}
    >
      {/* Full-width single-line action toolbar */}
      {showToolbar && (
        <div
          className={cn(
            "flex items-center shrink-0 px-4 py-2.5 border-b",
            isDarkMode
              ? "border-[#482083]/40 bg-[#1a0933]"
              : "border-[#4E1FBE]/15 bg-white",
          )}
        >
          <JsonEditorToolbar
            onFormat={handleFormat}
            onMinify={showMinify ? handleMinify : undefined}
            onValidate={handleValidate}
            onCopy={handleCopy}
            onSearch={handleSearch}
            isCopied={isCopied}
            readOnly={readOnly}
            isDarkMode={isDarkMode}
            className="w-full flex-nowrap justify-center gap-2"
          />
        </div>
      )}

      {/* Validation status notice if present */}
      {showValidation && (validationError || !isValid) && (
        <div className="px-5 pt-3 pb-1">
          <JsonValidationMessage isValid={isValid} error={validationError} />
        </div>
      )}

      {/* Scrollable editor body with JetBrains Mono font */}
      <div
        className="flex-1 min-h-0 w-full relative"
        style={{
          height,
        }}
      >
        <Editor
          height="100%"
          defaultLanguage="json"
          value={code}
          theme={isDarkMode ? "aura-dark" : "aura-light"}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            fontFamily:
              '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 13,
            lineHeight: 22,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            bracketPairColorization: { enabled: true },
            matchBrackets: "always",
            folding: true,
            foldingHighlight: true,
            showFoldingControls: "always",
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            glyphMargin: false,
            padding: { top: 8, bottom: 8 },
            renderLineHighlight: "all",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
              verticalScrollbarSize: 9,
              horizontalScrollbarSize: 9,
            },
          }}
          loading={
            <div
              className={cn(
                "flex items-center justify-center h-full text-xs font-mono p-6",
                isDarkMode ? "text-[#cdbdff]" : "text-[#4E1FBE]",
              )}
            >
              Loading JSON Schema Editor...
            </div>
          }
        />
      </div>
    </div>
  );
};
