// Summarize assistant turns in an exported OpenClaw trajectory (events.jsonl):
// for each assistant message, show whether it called tools and whether it carried visible text.
// Usage: node inspect-trajectory.mjs <trajectory-export-dir>
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: inspect-trajectory.mjs <export-dir>");
  process.exit(2);
}
const events = readFileSync(join(dir, "events.jsonl"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const textOf = (c) =>
  typeof c === "string"
    ? c
    : Array.isArray(c)
      ? c.filter((p) => p?.type === "text").map((p) => p.text).join("")
      : "";
const partsOf = (c) => (Array.isArray(c) ? c : []);

let turn = 0;
for (const ev of events) {
  const m = ev.message ?? ev.data?.message ?? ev.payload?.message;
  if (!m || m.role !== "assistant") continue;
  turn += 1;
  const parts = partsOf(m.content);
  const toolCalls = parts.filter((p) => /tool/i.test(p?.type ?? "") && p?.type !== "toolResult");
  const reasoning = parts.filter((p) => /think|reason/i.test(p?.type ?? ""));
  const text = textOf(m.content).trim();
  console.log(
    `turn ${turn}: toolCalls=${toolCalls.length} visibleTextChars=${text.length} reasoningParts=${reasoning.length}` +
      (text ? `\n   text: ${JSON.stringify(text.slice(0, 160))}` : ""),
  );
}
if (turn === 0) {
  console.log("no assistant messages found; event keys:", [...new Set(events.flatMap((e) => Object.keys(e)))].join(","));
}
