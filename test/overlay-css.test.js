const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");

// Regression guard: a fixed element that uses a non-none `display` (flex,
// inline-flex, etc.) will keep showing — and, if full-screen, keep intercepting
// clicks — even when it has the `hidden` attribute, because that display value
// overrides `hidden`'s default `display: none`. Every such element MUST have an
// explicit `[hidden]` rule. This caused two bugs: an invisible movie modal that
// froze the whole game, and a "Now showing" banner that appeared on load.
const OVERLAYS = ["movie-overlay", "satchel-overlay", "movie-screen", "movie-button"];

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
