import * as THREE from 'three';

type Variant = 'racks' | 'frequencies' | 'monitor';
const VARIANTS: Variant[] = ['racks', 'frequencies', 'monitor'];

const W = 512;
const H = 512;

const BG = '#02070d';
const STROKE_DIM = 'rgba(0, 229, 255, 0.45)';
const STROKE_BRIGHT = 'rgba(0, 229, 255, 0.75)';
const FILL_DIM = 'rgba(0, 229, 255, 0.18)';
const TEXT_DIM = 'rgba(127, 247, 232, 0.55)';
const TEXT_BRIGHT = 'rgba(0, 229, 255, 0.85)';

function drawBackground(ctx: CanvasRenderingContext2D) {
    const grad = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
    grad.addColorStop(0, '#08131f');
    grad.addColorStop(1, BG);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
}

// ── Variant A — Server racks: vertical stacked glowing data blocks
function drawServerRacks(ctx: CanvasRenderingContext2D, seed: number) {
    const rows = 9;
    const margin = 36;
    const rowH = (H - margin * 2 - 16) / rows;
    const rng = mulberry32(seed * 17 + 3);

    ctx.strokeStyle = STROKE_DIM;
    ctx.lineWidth = 1;
    ctx.strokeRect(margin - 6, margin - 6, W - (margin - 6) * 2, H - (margin - 6) * 2);

    for (let r = 0; r < rows; r++) {
        const y = margin + r * rowH;
        // Bar background outline
        ctx.fillStyle = 'rgba(0, 229, 255, 0.05)';
        ctx.fillRect(margin, y, W - margin * 2, rowH - 4);
        ctx.strokeStyle = STROKE_DIM;
        ctx.lineWidth = 1;
        ctx.strokeRect(margin + 0.5, y + 0.5, W - margin * 2 - 1, rowH - 5);

        // LEDs
        const leds = 14;
        const ledW = 14;
        const ledStart = margin + 110;
        const ledY = y + (rowH - 4) / 2 - 3;
        for (let l = 0; l < leds; l++) {
            const on = rng() > 0.4;
            ctx.fillStyle = on ? STROKE_BRIGHT : 'rgba(0, 229, 255, 0.10)';
            ctx.fillRect(ledStart + l * (ledW + 4), ledY, ledW, 6);
        }

        // Row label
        ctx.fillStyle = TEXT_BRIGHT;
        ctx.font = '11px "Consolas","Menlo",monospace';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            `N${(r + 1).toString().padStart(2, '0')}`,
            margin + 10,
            y + (rowH - 4) / 2,
        );

        // Right-side metric
        ctx.fillStyle = TEXT_DIM;
        ctx.fillText(
            `${Math.floor(rng() * 99)}%`,
            W - margin - 38,
            y + (rowH - 4) / 2,
        );
    }
    ctx.textBaseline = 'alphabetic';
}

// ── Variant B — Frequencies: pulsing wave on oscilloscope grid
function drawFrequencies(ctx: CanvasRenderingContext2D, seed: number) {
    const margin = 32;
    const innerW = W - margin * 2;
    const innerH = H - margin * 2;
    const cx = margin + innerW / 2;
    const cy = margin + innerH / 2;

    // Oscilloscope frame
    ctx.strokeStyle = STROKE_DIM;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(margin + 0.5, margin + 0.5, innerW - 1, innerH - 1);

    // Inner grid
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.lineWidth = 0.8;
    const cells = 8;
    for (let i = 1; i < cells; i++) {
        const x = margin + (i / cells) * innerW;
        ctx.beginPath(); ctx.moveTo(x, margin); ctx.lineTo(x, margin + innerH); ctx.stroke();
        const y = margin + (i / cells) * innerH;
        ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(margin + innerW, y); ctx.stroke();
    }

    // Center axis
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, cy);
    ctx.lineTo(margin + innerW, cy);
    ctx.stroke();

    // Waveform — composite sine, seeded
    const rng = mulberry32(seed * 31 + 7);
    const f1 = 2 + rng() * 2;
    const f2 = 5 + rng() * 4;
    const a1 = 0.35 + rng() * 0.15;
    const a2 = 0.10 + rng() * 0.10;
    const phase = rng() * Math.PI * 2;

    // Soft wide outer stroke (glow approximation)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.18)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = 0; x <= innerW; x += 2) {
        const u = x / innerW;
        const y =
            cy +
            (innerH / 2) *
                (a1 * Math.sin(u * Math.PI * 2 * f1 + phase) +
                    a2 * Math.sin(u * Math.PI * 2 * f2 + phase * 0.7));
        if (x === 0) ctx.moveTo(margin + x, y);
        else ctx.lineTo(margin + x, y);
    }
    ctx.stroke();

    // Crisp inner stroke
    ctx.strokeStyle = STROKE_BRIGHT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= innerW; x += 2) {
        const u = x / innerW;
        const y =
            cy +
            (innerH / 2) *
                (a1 * Math.sin(u * Math.PI * 2 * f1 + phase) +
                    a2 * Math.sin(u * Math.PI * 2 * f2 + phase * 0.7));
        if (x === 0) ctx.moveTo(margin + x, y);
        else ctx.lineTo(margin + x, y);
    }
    ctx.stroke();

    // Top-left readout
    ctx.fillStyle = TEXT_BRIGHT;
    ctx.font = '11px "Consolas","Menlo",monospace';
    ctx.fillText(`FREQ ${(f1 * 100).toFixed(1)} Hz`, margin + 10, margin + 18);
    ctx.fillStyle = TEXT_DIM;
    ctx.fillText(`AMP ${(a1 * 100).toFixed(0)}%`, margin + 10, margin + 34);
}

// ── Variant C — System monitor: minimalist terminal columns of fake logs
function drawSystemMonitor(ctx: CanvasRenderingContext2D, seed: number) {
    const rng = mulberry32(seed * 23 + 11);
    const margin = 28;

    // Three columns
    const cols = 3;
    const colW = (W - margin * 2) / cols;

    const sources = [
        'auth', 'http', 'db', 'cache', 'queue', 'cdn', 'rpc', 'svc',
    ];
    const codes = ['200 OK', '204 OK', '301 →', '401 ✗', '500 ✗', '202 ✓', '304 OK'];

    ctx.font = '10px "Consolas","Menlo",monospace';
    ctx.textBaseline = 'top';

    for (let c = 0; c < cols; c++) {
        const x = margin + c * colW;
        // Column header
        ctx.fillStyle = TEXT_BRIGHT;
        ctx.fillText(`[col_${c}]`, x, margin);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.20)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, margin + 16);
        ctx.lineTo(x + colW - 12, margin + 16);
        ctx.stroke();

        // Log lines
        const lines = 28;
        for (let i = 0; i < lines; i++) {
            const y = margin + 24 + i * 14;
            const tsM = Math.floor(rng() * 60);
            const tsS = Math.floor(rng() * 60);
            const src = sources[Math.floor(rng() * sources.length)];
            const code = codes[Math.floor(rng() * codes.length)];
            const isErr = code.startsWith('5') || code.startsWith('4');
            ctx.fillStyle = isErr
                ? 'rgba(255, 110, 110, 0.55)'
                : rng() > 0.7
                  ? TEXT_BRIGHT
                  : TEXT_DIM;
            const ts = `${tsM.toString().padStart(2, '0')}:${tsS
                .toString()
                .padStart(2, '0')}`;
            ctx.fillText(`${ts} ${src.padEnd(5, ' ')} ${code}`, x, y);
        }
    }

    ctx.textBaseline = 'alphabetic';

    // Bottom status bar
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.20)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, H - margin - 20);
    ctx.lineTo(W - margin, H - margin - 20);
    ctx.stroke();
    ctx.fillStyle = TEXT_BRIGHT;
    ctx.font = '10px "Consolas","Menlo",monospace';
    ctx.fillText('· stream live', margin, H - margin - 8);
}

// Tiny seedable PRNG so variants are deterministic per seed
function mulberry32(a: number) {
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function createPeripheralSchemaTexture(seed = 0): THREE.CanvasTexture {
    const variant = VARIANTS[seed % VARIANTS.length];
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    drawBackground(ctx);

    if (variant === 'racks') drawServerRacks(ctx, seed);
    else if (variant === 'frequencies') drawFrequencies(ctx, seed);
    else drawSystemMonitor(ctx, seed);

    // Variant tag at bottom-right
    ctx.fillStyle = 'rgba(127, 247, 232, 0.40)';
    ctx.font = '10px "Consolas","Menlo","Courier New",monospace';
    ctx.textAlign = 'right';
    ctx.fillText(
        `// node.${seed.toString().padStart(2, '0')} · ${variant}`,
        W - 16,
        H - 12,
    );
    ctx.textAlign = 'start';

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
}
