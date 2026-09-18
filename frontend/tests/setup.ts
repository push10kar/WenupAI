import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Automatically clean up rendered components after each test if in DOM environment
afterEach(() => {
  if (typeof window !== "undefined") {
    cleanup();
  }
});

// Polyfill window.HTMLElement.prototype.scrollIntoView for jsdom
if (
  typeof window !== "undefined" &&
  window.HTMLElement &&
  !window.HTMLElement.prototype.scrollIntoView
) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
