// Captures a scenario frame by frame next to its reference clip.
//
//   node scripts/capture.mjs <scenario> [--steps 1,2] [--frames 40]
//
// Each step gets our stage at the time of every reference frame from its
// `at` on, plus the reference frames themselves, in .parity/<scenario>.
// Frame 0 is the settled state before the step.
// Needs `pnpm dev` running and `pnpm references` done.
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    steps: { type: "string" },
    frames: { type: "string", default: "40" },
    url: { type: "string", default: "http://localhost:5199" },
  },
});
const [id] = positionals;
if (!id) throw new Error("Pass a scenario id, like family-keypad.");
const frames = Number(values.frames);
const out = join(root, ".parity", id);

const browser = await chromium.launch();
const page = await browser.newPage({
  deviceScaleFactor: 3,
  viewport: { width: 1600, height: 1200 },
});
await page.goto(`${values.url}/#${id}`);
await page.waitForFunction(() => window.playground && document.fonts.ready);
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({
  content:
    ".stage { border-radius: 0 !important; box-shadow: none !important; }",
});
await page.evaluate(() => window.playground.set("stepping", true));
const scenario = await page.evaluate(() => window.playground.scenario());
const reference = scenario.reference;
if (!reference?.crop) throw new Error(`${id} has no cropped reference.`);
const points = reference.scale ?? 3;
const indices = values.steps
  ? values.steps.split(",").map(Number)
  : scenario.steps.flatMap((step, i) => (i > 0 && step.at ? [i] : []));

const stage = page.locator(".stage");
const settled = () =>
  page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => setTimeout(done))),
  );

const previous = await readFile(join(out, "manifest.json"), "utf8").then(
  JSON.parse,
  () => null,
);
const same = JSON.stringify(previous?.crop) === JSON.stringify(reference.crop);
const manifest = {
  id,
  points,
  crop: reference.crop,
  steps: same ? previous.steps.filter((s) => !indices.includes(s.index)) : [],
};
if (!same) await rm(out, { recursive: true, force: true });
for (const index of indices) {
  const { at } = scenario.steps[index];
  const dir = join(out, String(index));
  await rm(dir, { recursive: true, force: true });
  await mkdir(join(dir, "ours"), { recursive: true });
  await mkdir(join(dir, "ref"), { recursive: true });

  const first = Math.ceil(at * 60 - 1e-6);
  await page.evaluate((i) => window.playground.settle(i), index - 1);
  await settled();
  await stage.screenshot({ path: join(dir, "ours", "0.png") });
  await page.evaluate((i) => window.playground.start(i), index);
  await settled();
  for (let k = 1; k <= frames; k++) {
    const ms = ((first + k - 1) / 60 - at) * 1000;
    await page.evaluate((t) => window.playground.seek(t), ms);
    await settled();
    await stage.screenshot({ path: join(dir, "ours", `${k}.png`) });
  }

  const { x, y, w, h } = reference.crop;
  const result = spawnSync(
    "ffmpeg",
    [
      "-nostdin",
      "-v",
      "error",
      "-i",
      join(root, "public", reference.src),
      "-vf",
      `select='between(n\\,${first - 1}\\,${first + frames - 1})',crop=${w}:${h}:${x}:${y}`,
      "-fps_mode",
      "passthrough",
      "-start_number",
      "0",
      join(dir, "ref", "%d.png"),
    ],
    { stdio: "inherit" },
  );
  if (result.status) throw new Error(`ffmpeg failed on step ${index}.`);
  manifest.steps.push({
    index,
    at,
    first,
    frames,
    step: scenario.steps[index],
  });
  console.log(`${id} step ${index}: ${frames} frames from frame ${first}`);
}

manifest.steps.sort((a, b) => a.index - b.index);
await writeFile(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
await browser.close();
