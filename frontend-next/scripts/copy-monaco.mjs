// Copies the Monaco editor assets from node_modules into public/ so the IDE can
// load the editor from the same origin instead of a public CDN (jsdelivr). This
// keeps the code editor working offline and on locked-down networks (e.g. the
// college server). Runs automatically before `dev` and `build`.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules/monaco-editor/min/vs");
const dest = resolve(root, "public/monaco/vs");

if (!existsSync(src)) {
  console.warn("[copy-monaco] monaco-editor not found in node_modules — skipping (run `npm install`).");
  process.exit(0);
}

mkdirSync(dirname(dest), { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`[copy-monaco] copied Monaco assets → public/monaco/vs`);
