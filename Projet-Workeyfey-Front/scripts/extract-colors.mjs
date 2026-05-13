#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Automated palette extraction for the page-level GlobalFluidMesh.
 *
 * Reads `src/pages/Projects.tsx`, picks up every entry that has both an
 * `id` and a `frontUrl`, screenshots each URL with Puppeteer, then runs
 * `extract-colors` over the resulting pixels to derive a two-colour
 * primary/secondary palette. Output goes to `src/data/generatedPalettes.json`
 * which Projects.tsx imports at runtime.
 *
 *   Priority chain at runtime:
 *     1. slide.manualColors   (artistic override)
 *     2. generatedPalettes[id] (this script's output)
 *     3. Liquid Silver default (shader handles the achromatic look)
 *
 * Run:   npm run colors
 *
 * Failures are non-fatal: a project that times out / 404s / blocks the
 * iframe just gets skipped (it keeps its previous palette from the JSON
 * if any, otherwise falls through to Liquid Silver at runtime).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { extractColors } from 'extract-colors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const PROJECTS_TSX = join(ROOT, 'src/pages/Projects.tsx');
const OUTPUT_JSON = join(ROOT, 'src/data/generatedPalettes.json');

const VIEWPORT = { width: 1280, height: 800 };
const NAV_TIMEOUT_MS = 30_000;
const POST_LOAD_DELAY_MS = 1500;
const SAMPLE_SIZE = 200; // px square — fast quantisation, still representative.

/* ------------------------------------------------------------------ */
/* Discovery                                                          */
/* ------------------------------------------------------------------ */

/**
 * Pulls `{id, frontUrl}` pairs out of Projects.tsx via a regex on the
 * memberSlides literal. Relies on the canonical formatting:
 *     id: 'xxx',
 *     frontUrl: 'https://…',
 * If the file ever gets reformatted in a way that separates these
 * fields, update the regex below. The order of fields inside each
 * object can flip — we look for the two keys near each other, not in
 * a fixed order.
 */
function discoverTargets() {
    const src = readFileSync(PROJECTS_TSX, 'utf8');
    const re = /id:\s*'([^']+)',\s*frontUrl:\s*'([^']+)'/g;
    const out = [];
    let m;
    while ((m = re.exec(src)) !== null) {
        out.push({ id: m[1], frontUrl: m[2] });
    }
    return out;
}

/* ------------------------------------------------------------------ */
/* Palette selection                                                  */
/* ------------------------------------------------------------------ */

function rgbToHex(r, g, b) {
    const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
    const hex = (n) => clamp(n).toString(16).padStart(2, '0');
    return ('#' + hex(r) + hex(g) + hex(b)).toUpperCase();
}

/**
 * Pick a primary/secondary pair from extract-colors' output.
 *
 *   Primary  → most "perceptually prominent" colour. Weight by area but
 *              boost saturated swatches so a small accent doesn't lose to
 *              a huge muted background. This mirrors how the eye picks
 *              a brand colour out of a screenshot.
 *   Secondary → most prominent swatch that contrasts in lightness (> 0.18
 *              away from primary), to give the mesh a real left/right
 *              gradient rather than two near-identical hues. Falls back
 *              to the second-most-prominent if no good contrast exists.
 *
 * For a B&W site, all returned colours will have near-zero saturation —
 * the shader's achromatic detection (chroma < 0.15) auto-kicks in and
 * renders Liquid Silver. We don't need a special branch here.
 */
function pickPalette(colors) {
    if (!colors || !colors.length) return null;
    const scored = colors.map((c) => ({
        ...c,
        score: c.area * (0.4 + c.saturation),
    }));
    const ranked = [...scored].sort((a, b) => b.score - a.score);

    const primary = ranked[0];
    let secondary = ranked
        .slice(1)
        .find((c) => Math.abs(c.lightness - primary.lightness) > 0.18);
    if (!secondary) secondary = ranked[1] ?? primary;

    return [
        rgbToHex(primary.red, primary.green, primary.blue),
        rgbToHex(secondary.red, secondary.green, secondary.blue),
    ];
}

/* ------------------------------------------------------------------ */
/* Screenshot + extract                                               */
/* ------------------------------------------------------------------ */

async function screenshotPage(browser, url) {
    const page = await browser.newPage();
    try {
        await page.setViewport(VIEWPORT);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: NAV_TIMEOUT_MS });
        // Beat for late-loading fonts / hero animations / lazy images.
        await new Promise((r) => setTimeout(r, POST_LOAD_DELAY_MS));
        return await page.screenshot({ type: 'png', fullPage: false });
    } finally {
        await page.close();
    }
}

async function paletteFromScreenshot(buf) {
    const { data, info } = await sharp(buf)
        .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: 'cover' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
    const colors = await extractColors({
        data: pixels,
        width: info.width,
        height: info.height,
    });
    return pickPalette(colors);
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
    const targets = discoverTargets();
    console.log(`Discovered ${targets.length} target(s) with frontUrl.\n`);
    if (!targets.length) {
        console.log('Nothing to extract. Exiting.');
        return;
    }

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const results = {};
    try {
        for (const { id, frontUrl } of targets) {
            const label = id.padEnd(22);
            process.stdout.write(`  [${label}] ${frontUrl}\n${' '.repeat(label.length + 5)}`);
            try {
                const buf = await screenshotPage(browser, frontUrl);
                const palette = await paletteFromScreenshot(buf);
                if (!palette) throw new Error('no usable swatches');
                results[id] = {
                    colors: palette,
                    source: frontUrl,
                    extractedAt: new Date().toISOString(),
                };
                process.stdout.write(`✓ ${palette[0]}  →  ${palette[1]}\n`);
            } catch (err) {
                process.stdout.write(`✗ ${err?.message ?? err}\n`);
            }
        }
    } finally {
        await browser.close();
    }

    // Merge with previous output so projects that failed this run keep
    // their previously-extracted palette (graceful degradation) instead
    // of getting silently dropped back to Liquid Silver.
    let previous = {};
    if (existsSync(OUTPUT_JSON)) {
        try {
            previous = JSON.parse(readFileSync(OUTPUT_JSON, 'utf8'));
        } catch {
            // Corrupt or empty — start fresh.
        }
    }
    const merged = { ...previous, ...results };

    mkdirSync(dirname(OUTPUT_JSON), { recursive: true });
    writeFileSync(OUTPUT_JSON, JSON.stringify(merged, null, 2) + '\n');

    const ok = Object.keys(results).length;
    console.log(
        `\n✓ Wrote ${OUTPUT_JSON}` +
        `\n  ${ok}/${targets.length} extracted this run.` +
        `\n  ${Object.keys(merged).length} total palettes stored.`,
    );
}

main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
