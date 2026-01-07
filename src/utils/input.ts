export async function promptHidden(message: string): Promise<string> {
  process.stdout.write(message);

  // Use Bun's password utility if available, otherwise fallback to basic stdin
  const password = await new Promise<string>((resolve) => {
    const stdin = process.stdin;
    let input = "";

    // Try to disable echo
    if (stdin.isTTY && stdin.setRawMode) {
      stdin.setRawMode(true);
    }

    stdin.on("data", (chunk) => {
      const char = chunk.toString();

      // Handle Enter (newline)
      if (char === "\n" || char === "\r" || char === "\r\n") {
        if (stdin.isTTY && stdin.setRawMode) {
          stdin.setRawMode(false);
        }
        stdin.removeAllListeners("data");
        process.stdout.write("\n");
        resolve(input);
        return;
      }

      // Handle Ctrl+C
      if (char === "\u0003") {
        if (stdin.isTTY && stdin.setRawMode) {
          stdin.setRawMode(false);
        }
        stdin.removeAllListeners("data");
        process.stdout.write("\n");
        process.exit(1);
      }

      // Handle backspace
      if (char === "\u007f" || char === "\b") {
        if (input.length > 0) {
          input = input.slice(0, -1);
        }
        return;
      }

      // Add character to input (don't echo it)
      input += char;
    });
  });

  return password;
}

export async function promptMultiline(message: string): Promise<string> {
  process.stdout.write(message);

  const lines: string[] = [];

  for await (const line of console) {
    lines.push(line);
  }

  return lines.join("\n");
}

export async function confirm(message: string): Promise<boolean> {
  process.stdout.write(message);

  const answer = await new Promise<string>((resolve) => {
    const stdin = process.stdin;

    const handleData = (chunk: Buffer) => {
      const input = chunk.toString().trim().toLowerCase();
      stdin.removeListener("data", handleData);
      resolve(input);
    };

    stdin.on("data", handleData);
  });

  return answer === "y" || answer === "yes";
}
