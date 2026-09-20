import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JsonValidationMessage } from "../src/components/json-editor/JsonValidationMessage";
import { JsonEditorToolbar } from "../src/components/json-editor/JsonEditorToolbar";
import { JsonEditorCard } from "../src/components/json-editor/JsonEditorCard";

describe("JsonValidationMessage", () => {
  it("renders valid status when isValid is true and no error", () => {
    render(<JsonValidationMessage isValid={true} />);
    expect(screen.getByTestId("json-validation-valid")).toHaveTextContent(
      "Valid JSON",
    );
  });

  it("renders error message and line number when error is provided", () => {
    render(
      <JsonValidationMessage
        isValid={false}
        error={{
          message: "Unexpected token '}' at position 12",
          line: 4,
          column: 2,
        }}
      />,
    );
    const errorEl = screen.getByTestId("json-validation-error");
    expect(errorEl).toHaveTextContent("Invalid JSON");
    expect(errorEl).toHaveTextContent("Line 4:2");
    expect(errorEl).toHaveTextContent("Unexpected token");
  });
});

describe("JsonEditorToolbar", () => {
  it("triggers callbacks for format, minify, validate, copy, and search", () => {
    const handleFormat = vi.fn();
    const handleMinify = vi.fn();
    const handleValidate = vi.fn();
    const handleCopy = vi.fn();
    const handleSearch = vi.fn();

    render(
      <JsonEditorToolbar
        onFormat={handleFormat}
        onMinify={handleMinify}
        onValidate={handleValidate}
        onCopy={handleCopy}
        onSearch={handleSearch}
        isDarkMode={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Format JSON" }));
    expect(handleFormat).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Minify JSON" }));
    expect(handleMinify).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Validate JSON" }));
    expect(handleValidate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Copy JSON" }));
    expect(handleCopy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(handleSearch).toHaveBeenCalledTimes(1);
  });
});

describe("JsonEditorCard", () => {
  it("renders the centered action toolbar without the removed header labels", () => {
    const initialData = {
      full_name: "Jane Smith",
      covers_worldwide_assets: true,
    };
    render(
      <JsonEditorCard
        title="JSON Schema Editor"
        subtitle="Custom Schema"
        initialData={initialData}
        isDarkMode={true}
      />,
    );

    expect(screen.queryByText("JSON Schema Editor")).not.toBeInTheDocument();
    expect(screen.queryByText("Custom Schema")).not.toBeInTheDocument();
    expect(screen.getByTestId("json-editor-toolbar")).toHaveClass(
      "justify-center",
    );
    expect(
      screen.getByRole("button", { name: "Format JSON" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy JSON" }),
    ).toBeInTheDocument();
  });
});
