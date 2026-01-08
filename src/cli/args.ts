export interface ParsedArgs {
  command: string;
  args: string[];
  flags: {
    help?: boolean;
    version?: boolean;
    json?: boolean;
    env?: string;
    from?: string;
    fromEnv?: string;
    toEnv?: string;
    project?: string;
    value?: string;
    multiline?: boolean;
    strict?: boolean;
    all?: boolean;
    yes?: boolean;
  };
}

export function parseArgs(argv: string[]): ParsedArgs {
  // argv is Bun.argv, which starts with [bun, script.ts, ...args]
  // We skip the first 2 elements
  const args = argv.slice(2);

  const result: ParsedArgs = {
    command: "",
    args: [],
    flags: {},
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (!arg) {
      i++;
      continue;
    }

    // Handle flags
    if (arg.startsWith("--")) {
      // Long flags like --help, --env=dev, --env dev
      const flagName = arg.slice(2);

      if (flagName.includes("=")) {
        // --env=dev format
        const [name, value] = flagName.split("=", 2);
        parseFlagWithValue(result.flags, name!, value!);
      } else {
        // Check if it's a boolean flag or has a value
        const nextArg = args[i + 1];
        if (isBooleanFlag(flagName)) {
          parseBooleanFlag(result.flags, flagName);
        } else if (nextArg && !nextArg.startsWith("-")) {
          // Has a value in next arg
          parseFlagWithValue(result.flags, flagName, nextArg);
          i++; // Skip next arg
        } else {
          // Treat as boolean flag
          parseBooleanFlag(result.flags, flagName);
        }
      }
    } else if (arg.startsWith("-") && arg.length > 1) {
      // Short flags like -p, -all
      const flagName = arg.slice(1);

      if (flagName === "p") {
        // -p <project> expects a value
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith("-")) {
          result.flags.project = nextArg;
          i++; // Skip next arg
        }
      } else if (flagName === "y") {
        result.flags.yes = true;
      } else if (flagName === "all") {
        result.flags.all = true;
      }
    } else {
      // Positional argument
      if (!result.command) {
        result.command = arg;
      } else {
        result.args.push(arg);
      }
    }

    i++;
  }

  return result;
}

function isBooleanFlag(name: string): boolean {
  return ["help", "version", "json", "multiline", "strict", "all", "yes"].includes(name);
}

function parseBooleanFlag(flags: ParsedArgs["flags"], name: string): void {
  switch (name) {
    case "help":
      flags.help = true;
      break;
    case "version":
      flags.version = true;
      break;
    case "json":
      flags.json = true;
      break;
    case "multiline":
      flags.multiline = true;
      break;
    case "strict":
      flags.strict = true;
      break;
    case "all":
      flags.all = true;
      break;
    case "yes":
      flags.yes = true;
      break;
  }
}

function parseFlagWithValue(flags: ParsedArgs["flags"], name: string, value: string): void {
  switch (name) {
    case "env":
    case "environment":
      flags.env = value;
      break;
    case "from":
      flags.from = value;
      break;
    case "from-env":
      flags.fromEnv = value;
      break;
    case "to-env":
      flags.toEnv = value;
      break;
    case "value":
      flags.value = value;
      break;
    case "project":
    case "p":
      flags.project = value;
      break;
  }
}
