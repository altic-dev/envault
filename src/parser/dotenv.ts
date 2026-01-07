export interface ParseResult {
  variables: Record<string, string>;
  errors: ParseError[];
}

export interface ParseError {
  line: number;
  message: string;
}

export function parse(content: string, options?: { strict?: boolean }): ParseResult {
  const result: ParseResult = {
    variables: {},
    errors: [],
  };

  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    const lineNum = i + 1;

    // Skip empty lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Skip comments
    if (line.trim().startsWith("#")) {
      i++;
      continue;
    }

    // Parse KEY=VALUE
    const equalIndex = line.indexOf("=");
    if (equalIndex === -1) {
      result.errors.push({
        line: lineNum,
        message: `Invalid syntax: missing '=' character`,
      });
      i++;
      continue;
    }

    const key = line.slice(0, equalIndex).trim();
    if (!key) {
      result.errors.push({
        line: lineNum,
        message: `Invalid syntax: empty key`,
      });
      i++;
      continue;
    }

    const valueStart = line.slice(equalIndex + 1);

    try {
      const { value, linesConsumed } = parseValue(valueStart, lines.slice(i));
      result.variables[key] = value;
      i += linesConsumed;
    } catch (error) {
      result.errors.push({
        line: lineNum,
        message: error instanceof Error ? error.message : String(error),
      });
      i++;
    }
  }

  return result;
}

function parseValue(valueStart: string, remainingLines: string[]): { value: string; linesConsumed: number } {
  const trimmed = valueStart.trim();

  // Empty value
  if (trimmed === "") {
    return { value: "", linesConsumed: 1 };
  }

  // Double-quoted value
  if (trimmed.startsWith('"')) {
    return parseQuotedValue(trimmed, remainingLines, '"');
  }

  // Single-quoted value
  if (trimmed.startsWith("'")) {
    return parseQuotedValue(trimmed, remainingLines, "'");
  }

  // Unquoted value - take everything until end of line, trim trailing whitespace
  const value = trimmed.split("#")[0]!.trim(); // Support inline comments
  return { value, linesConsumed: 1 };
}

function parseQuotedValue(
  valueStart: string,
  remainingLines: string[],
  quoteChar: '"' | "'"
): { value: string; linesConsumed: number } {
  let value = "";
  let lineIndex = 0;
  let charIndex = 1; // Skip opening quote
  let escaped = false;

  const currentLine = valueStart;

  while (true) {
    if (lineIndex >= remainingLines.length) {
      throw new Error(`Unterminated quoted value`);
    }

    const line = lineIndex === 0 ? currentLine : remainingLines[lineIndex]!;

    while (charIndex < line.length) {
      const char = line[charIndex]!;

      if (escaped) {
        // Handle escape sequences
        switch (char) {
          case "n":
            value += "\n";
            break;
          case "r":
            value += "\r";
            break;
          case "t":
            value += "\t";
            break;
          case "\\":
            value += "\\";
            break;
          case '"':
            value += '"';
            break;
          case "'":
            value += "'";
            break;
          default:
            // Unknown escape, keep as-is
            value += char;
        }
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quoteChar) {
        // Found closing quote
        return { value, linesConsumed: lineIndex + 1 };
      } else {
        value += char;
      }

      charIndex++;
    }

    // Move to next line (multiline value)
    value += "\n";
    lineIndex++;
    charIndex = 0;
  }
}

export function write(variables: Record<string, string>): string {
  // Sort keys alphabetically
  const sortedKeys = Object.keys(variables).sort();

  const lines: string[] = [];

  for (const key of sortedKeys) {
    const value = variables[key]!;
    const quotedValue = needsQuoting(value) ? quoteValue(value) : value;
    lines.push(`${key}=${quotedValue}`);
  }

  return lines.join("\n");
}

function needsQuoting(value: string): boolean {
  // Empty values don't need quotes
  if (value === "") {
    return false;
  }

  // Check if value contains special characters that need quoting
  // Simple values (alphanumeric, -, _) don't need quotes
  const simplePattern = /^[a-zA-Z0-9_-]+$/;
  return !simplePattern.test(value);
}

function quoteValue(value: string): string {
  // Use double quotes
  let escaped = value
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/"/g, '\\"')   // Escape double quotes
    .replace(/\n/g, "\\n")  // Escape newlines
    .replace(/\r/g, "\\r")  // Escape carriage returns
    .replace(/\t/g, "\\t"); // Escape tabs

  return `"${escaped}"`;
}

export function getEnvFileName(environment: string): string {
  if (environment === "default") {
    return ".env";
  }
  return `.env.${environment}`;
}
