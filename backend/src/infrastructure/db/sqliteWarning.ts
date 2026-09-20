const defaultEmitWarning = process.emitWarning.bind(process);

process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
  if (
    typeof warning === "string" &&
    warning.includes("SQLite is an experimental feature")
  ) {
    return;
  }
  (defaultEmitWarning as (...a: unknown[]) => void).apply(process, [
    warning,
    ...args,
  ]);
}) as typeof process.emitWarning;