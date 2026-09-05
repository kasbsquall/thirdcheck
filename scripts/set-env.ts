/**
 * Writes a secret into .env without it passing through a chat log, a shell argument or
 * the shell history. The value is typed at a hidden prompt and goes straight to the file.
 *
 *   npx ts-node scripts/set-env.ts SEPOLIA_RPC_URL
 *
 * Only the key name is given on the command line. The value is prompted for, never echoed,
 * and the confirmation line shows it masked.
 */
import { createInterface } from "readline";
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { resolve } from "path";

const ENV_PATH = resolve(__dirname, "..", ".env");
const EXAMPLE_PATH = resolve(__dirname, "..", ".env.example");

/** Keeps head and tail visible so you can confirm you pasted the right thing. */
function mask(value: string): string {
  if (value.length <= 12) return "*".repeat(value.length);
  return `${value.slice(0, 30)}${"*".repeat(8)}${value.slice(-4)}`;
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolvePrompt) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

    // Swallow the echo so the value never appears on screen or in a scrollback buffer.
    const output = rl as unknown as { output: NodeJS.WriteStream; _writeToOutput?: (s: string) => void };
    let muted = false;
    output._writeToOutput = function (chunk: string) {
      if (!muted) output.output.write(chunk);
    };

    rl.question(question, (answer) => {
      muted = false;
      output.output.write("\n");
      rl.close();
      resolvePrompt(answer.trim());
    });

    muted = true;
  });
}

async function main() {
  const key = process.argv[2];
  if (!key || !/^[A-Z0-9_]+$/.test(key)) {
    console.error("\n  usage: npx ts-node scripts/set-env.ts VARIABLE_NAME\n");
    process.exitCode = 1;
    return;
  }

  if (!existsSync(ENV_PATH)) {
    if (!existsSync(EXAMPLE_PATH)) throw new Error(".env.example is missing, cannot bootstrap .env");
    copyFileSync(EXAMPLE_PATH, ENV_PATH);
    console.log("Created .env from .env.example");
  }

  const value = await promptHidden(`\n  Paste the value for ${key} (input hidden), then Enter:\n  > `);
  if (!value) {
    console.error("  Nothing entered, .env left unchanged.\n");
    process.exitCode = 1;
    return;
  }

  const original = readFileSync(ENV_PATH, "utf8");
  const line = `${key}=${value}`;
  const updated = new RegExp(`^${key}=.*$`, "m").test(original)
    ? original.replace(new RegExp(`^${key}=.*$`, "m"), line)
    : `${original.trimEnd()}\n${line}\n`;

  writeFileSync(ENV_PATH, updated, { mode: 0o600 });

  console.log(`  ${key} written to .env`);
  console.log(`  value: ${mask(value)}\n`);
}

main().catch((e) => {
  console.error(`\n  ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
