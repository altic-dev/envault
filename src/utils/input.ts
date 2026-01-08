export async function promptHidden(message: string): Promise<string> {
  process.stdout.write(message);

  // Use Bun's password utility if available, otherwise fallback to basic stdin
  const password = await new Promise<string>((resolve) => {
    const stdin = process.stdin;
    let input = "";

    const cleanup = (opts?: { newline?: boolean }) => {
      if (stdin.isTTY && stdin.setRawMode) {
        stdin.setRawMode(false);
      }
      stdin.pause();
      if (opts?.newline) process.stdout.write("\n");
    };

    // Try to disable echo
    if (stdin.isTTY && stdin.setRawMode) {
      stdin.setRawMode(true);
    }

    stdin.resume();

    const handleData = (chunk: Buffer) => {
      const char = chunk.toString();

      // Handle Enter (newline)
      if (char === "\n" || char === "\r" || char === "\r\n") {
        stdin.off("data", handleData);
        cleanup({ newline: true });
        resolve(input);
        return;
      }

      // Handle Ctrl+C
      if (char === "\u0003") {
        stdin.off("data", handleData);
        cleanup({ newline: true });
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
    };

    stdin.on("data", handleData);
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

    stdin.resume();
    stdin.once("data", (chunk: Buffer) => {
      const raw = chunk.toString();
      // Ctrl+C
      if (raw.includes("\u0003")) {
        stdin.pause();
        process.stdout.write("\n");
        process.exit(1);
      }

      stdin.pause();
      resolve(raw.trim().toLowerCase());
    });
  });

  return answer === "y" || answer === "yes";
}
