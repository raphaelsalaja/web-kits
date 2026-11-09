// Opens, closes and reopens every component in both effects in Chromium, and
// fails on anything left behind or logged.

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { createServer } from "vite";

const COMPONENTS = ["Dialog", "Popover", "Menu", "Select"];
const EFFECTS = ["launch", "genie", "switch"];
const LAYERS = "[data-launch], [data-genie], [data-springboard-debug]";
const POPUPS = "[role=dialog], [role=menu], [role=listbox]";

const server = await createServer({
	root: dirname(fileURLToPath(import.meta.url)),
	logLevel: "error",
	server: { port: 0 },
});
await server.listen();
const browser = await chromium.launch();
const failures = [];

try {
	const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
	page.on("pageerror", (error) =>
		failures.push(`page error: ${error.message}`),
	);
	page.on("console", (message) => {
		if (message.type() === "error") failures.push(`console: ${message.text()}`);
	});
	await page.goto(server.resolvedUrls.local[0], { waitUntil: "networkidle" });

	for (const component of COMPONENTS) {
		await page.getByRole("radio", { name: component }).click();
		for (const effect of EFFECTS) {
			const pane = page.locator(`[data-effect="${effect}"]`);
			const trigger = pane.locator("button, [role=combobox]").first();
			const fail = (message) =>
				failures.push(`${component} ${effect}: ${message}`);

			for (const round of ["first", "again"]) {
				// The switch pane plays launch, then the genie.
				const playing =
					effect === "switch"
						? round === "first"
							? "launch"
							: "genie"
						: effect;
				await trigger.click();
				await page.waitForTimeout(60);
				if ((await pane.locator(`[data-${playing}]`).count()) === 0) {
					fail(`${round} open didn't draw the ${playing}`);
				}
				// The playground gives launch a 6 × 4 grid.
				const tiles = await pane.locator("[data-launch] > div").count();
				if (playing === "launch" && tiles !== 24) {
					fail(`${round} open ignored the grid (${tiles} tiles)`);
				}
				await page.waitForTimeout(1200);

				const open = pane.locator(POPUPS).first();
				if ((await pane.locator(LAYERS).count()) > 0) {
					fail(`${round} open left its copies`);
				}
				const state = await open.evaluate((popup) => {
					const style = getComputedStyle(popup);
					const box = popup.getBoundingClientRect();
					const stage = popup.closest("[data-effect]").getBoundingClientRect();
					return {
						open: popup.hasAttribute("data-open"),
						opacity: style.opacity,
						visibility: style.visibility,
						inside:
							box.left >= stage.left - 1 &&
							box.right <= stage.right + 1 &&
							box.top >= stage.top - 1 &&
							box.bottom <= stage.bottom + 1,
					};
				});
				if (!state.open) fail(`${round} open didn't open`);
				if (state.opacity !== "1" || state.visibility !== "visible") {
					fail(
						`${round} open is hidden (${state.opacity}, ${state.visibility})`,
					);
				}
				if (!state.inside) fail(`${round} open is outside its pane`);
				const hidden = await trigger.evaluate(
					(button) => getComputedStyle(button).opacity,
				);
				if (playing === "launch" && hidden !== "0") {
					fail(`${round} open left the target showing`);
				}

				await page.keyboard.press("Escape");
				await page.waitForTimeout(1500);
				if ((await pane.locator("[data-open]").count()) > 0) {
					fail(`${round} close didn't close`);
				}
				if ((await pane.locator(LAYERS).count()) > 0) {
					fail(`${round} close left its copies`);
				}
				const shown = await trigger.evaluate(
					(button) => getComputedStyle(button).opacity,
				);
				if (shown !== "1") fail(`${round} close left the target hidden`);
			}
		}
	}
} finally {
	await browser.close();
	await server.close();
}

if (failures.length > 0) {
	console.error(failures.join("\n"));
	process.exit(1);
}
console.log(
	`${COMPONENTS.length * EFFECTS.length * 2} opens and closes, all clean`,
);
