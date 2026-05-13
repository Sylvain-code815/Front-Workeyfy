import * as THREE from 'three';

const W = 1024;
const H = 1024;

const GRID_COLOR = 'rgba(0, 229, 255, 0.30)';
const GRID_COLOR_FAR = 'rgba(0, 229, 255, 0.12)';
const GLOW_COLOR = 'rgba(0, 229, 255, 0.55)';
const SCANLINE_COLOR = 'rgba(0, 229, 255, 0.06)';

function drawRadialBackground(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createRadialGradient(
        W / 2,
        H / 2,
        Math.min(W, H) * 0.05,
        W / 2,
        H / 2,
        Math.max(W, H) * 0.7,
    );
    gradient.addColorStop(0, '#0c1b2e');
    gradient.addColorStop(0.55, '#040c18');
    gradient.addColorStop(1, '#000308');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
}

function drawScanlines(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = SCANLINE_COLOR;
    for (let y = 0; y < H; y += 4) {
        ctx.fillRect(0, y, W, 1);
    }
}

function drawPerspectiveGrid(ctx: CanvasRenderingContext2D) {
    const horizonY = H * 0.5;
    const vanishX = W / 2;

    // Soft horizon glow band
    const horizonGlow = ctx.createLinearGradient(0, horizonY - 20, 0, horizonY + 20);
    horizonGlow.addColorStop(0, 'rgba(0, 229, 255, 0)');
    horizonGlow.addColorStop(0.5, 'rgba(0, 229, 255, 0.18)');
    horizonGlow.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, horizonY - 20, W, 40);

    // Horizon line — thin bright cyan
    ctx.strokeStyle = GLOW_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(W, horizonY);
    ctx.stroke();

    // === FLOOR (bottom half) ===
    // Depth lines: rays from vanishing point through evenly-spaced bottom-edge points
    const depthLineCount = 21;
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1.2;
    for (let i = 0; i <= depthLineCount; i++) {
        const tx = (i / depthLineCount) * W;
        ctx.beginPath();
        ctx.moveTo(vanishX, horizonY);
        ctx.lineTo(tx, H);
        ctx.stroke();
    }

    // Transverse floor lines: foreshortened (closer near horizon)
    const transverseCount = 12;
    for (let i = 1; i <= transverseCount; i++) {
        const t = i / transverseCount;
        // Ease so lines bunch near horizon (perspective foreshortening)
        const eased = Math.pow(t, 2.2);
        const y = horizonY + eased * (H - horizonY);
        const alpha = 0.10 + 0.25 * t; // farther = dimmer, closer = brighter
        ctx.strokeStyle = `rgba(0, 229, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 0.8 + 1.2 * t;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }

    // === SKY (upper half) — much fainter mirrored grid for symmetric depth ===
    ctx.strokeStyle = GRID_COLOR_FAR;
    ctx.lineWidth = 1;
    for (let i = 0; i <= depthLineCount; i++) {
        const tx = (i / depthLineCount) * W;
        ctx.beginPath();
        ctx.moveTo(vanishX, horizonY);
        ctx.lineTo(tx, 0);
        ctx.stroke();
    }
    const skyTransverse = 6;
    for (let i = 1; i <= skyTransverse; i++) {
        const t = i / skyTransverse;
        const eased = Math.pow(t, 2.2);
        const y = horizonY - eased * horizonY;
        const alpha = 0.05 + 0.10 * t;
        ctx.strokeStyle = `rgba(0, 229, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 0.6 + 0.6 * t;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }
}

function drawCornerHud(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
    ctx.lineWidth = 1.2;
    const m = 28;
    const len = 36;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(m, m + len); ctx.lineTo(m, m); ctx.lineTo(m + len, m);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(W - m - len, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + len);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(m, H - m - len); ctx.lineTo(m, H - m); ctx.lineTo(m + len, H - m);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(W - m - len, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - len);
    ctx.stroke();

    ctx.fillStyle = 'rgba(127, 247, 232, 0.55)';
    ctx.font = '11px "Consolas","Menlo","Courier New",monospace';
    ctx.fillText('// SYS.LINK 0x4F·ACTIVE', m + 8, m + 16);
}

export function createCentralSchemaTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    drawRadialBackground(ctx);
    drawPerspectiveGrid(ctx);
    drawScanlines(ctx);
    drawCornerHud(ctx);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
}
