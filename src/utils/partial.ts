export function partialValue(value: string): string {
  if (value === "") {
    return "(empty)";
  }

  if (value.length <= 8) {
    // Too short for meaningful partial display
    // Just show first 4 characters + ...
    return value.substring(0, 4) + "...";
  }

  // Show first 4 and last 4 characters
  const first = value.substring(0, 4);
  const last = value.substring(value.length - 4);
  return `${first}...${last}`;
}
