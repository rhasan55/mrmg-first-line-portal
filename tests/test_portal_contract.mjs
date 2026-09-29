import assert from "node:assert/strict";
import fs from "node:fs/promises";

const html = await fs.readFile(new URL("../static/index.html", import.meta.url), "utf8");
const app = await fs.readFile(new URL("../static/app.js", import.meta.url), "utf8");
const publicSource = `${html}\n${app}`;

for (const exactText of [
  "Which of the following types of GenAI solution fits this use-case best? (Select one)",
  "Customized solution for a specific business purpose or use",
  "e.g., deck generation, control recommender, tech care support, etc.",
  "Models used for enhancing customer experience with no direct impact on AXP's core business",
  "Models used to create process efficiencies for colleagues with no direct impact on AXP's core business",
]) assert.match(html, new RegExp(exactText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

assert.doesNotMatch(app, /\b(?:route|score)\(\)/, "Every live routing call must receive the current form data");
assert.match(app, /function activeSteps\(data = formData\(\)\)/);

const playground = html.slice(html.indexOf('<dialog class="playground-sheet"'), html.indexOf('<dialog class="second-line-sheet"'));
for (const forbidden of [/\bMIC\b/i, /\bqn\b/i, /\bql\b/i, /\bcx\b/i, /\bdd\b/i, /0\.4\s*[×x]/, /1\.20|1\.80|2\.20|2\.10/]) {
  assert.doesNotMatch(playground, forbidden, `Playground should not expose ${forbidden}`);
}
assert.match(playground, /Business impact/);
assert.match(playground, /Business importance/);
assert.match(playground, /Model-complexity consideration/);
assert.match(playground, /Downstream dependencies/);
assert.doesNotMatch(publicSource, /\bvba\b/i);

console.log("Portal contract verified: live form routing, source wording, outcome-only playground, and public-copy guardrails.");
