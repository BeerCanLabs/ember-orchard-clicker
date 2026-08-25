const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");

// Regression guard: a full-screen fixed overlay that uses `display: flex` (or
// any non-none display) will keep intercepting clicks even when it has the
// `hidden` attribute, because that display value overrides `hidden`'s default
// `display: none`. Every such overlay MUST have an explicit `[hidden]` rule.
// This was the bug that froze the whole game behind an invisible movie modal.
const OVERLAYS = ["movie-overlay", "satchel-overlay"];

for (const name of OVERLAYS) {
  test(`KPF UI: .${name} is fully hidden (not just transparent) when [hidden]`, () => {
    const hasHiddenRule = new RegExp(
      `\\.${name}\\[hidden\\]\\s*\\{[^}]*display\\s*:\\s*none`,
      "i"
    ).test(css);
    assert.ok(
      hasHiddenRule,
      `.${name}[hidden] must set display:none, or the invisible full-screen overlay will block all clicks`
    );
  });
}
