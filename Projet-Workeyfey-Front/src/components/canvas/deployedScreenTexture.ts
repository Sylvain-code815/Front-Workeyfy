import * as THREE from 'three';

const W = 1024;
const H = 1024;

const GREEN_CORE = '#22C55E';
const GREEN_SOFT = '#34F88B';
const GREEN_GLOW = 'rgba(34, 197, 94, 0.95)';

function drawBackground(ctx: CanvasRenderingContext2D) {
    const bg = ctx.createRadialGradient(
        W / 2,
        H * 0.42,
        20,
        W / 2,
        H / 2,
        Math.max(W, H) * 0.7,
    );
    bg.addColorStop(0, '#0a1f12');
    bg.addColorStop(0.5, '#04100a');
    bg.addColorStop(1, '#000805');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(34, 197, 94, 0.05)';
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
}

function drawCornerHud(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = 'rgba(127, 247, 167, 0.45)';
    ctx.lineWidth = 1.5;
    const m = 28;
    const len = 36;

    ctx.beginPath();
    ctx.moveTo(m, m + len); ctx.lineTo(m, m); ctx.lineTo(m + len, m);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(W - m - len, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + len);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(m, H - m - len); ctx.lineTo(m, H - m); ctx.lineTo(m + len, H - m);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(W - m - len, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - len);
    ctx.stroke();

    ctx.fillStyle = 'rgba(127, 247, 167, 0.55)';
    ctx.font = '12px "Consolas","Menlo","Courier New",monospace';
    ctx.fillText('// SYS.LINK 0x4F·DEPLOYED', m + 8, m + 16);
    ctx.textAlign = 'right';
    ctx.fillText('UPTIME 100%', W - m - 8, m + 16);
    ctx.textAlign = 'left';
}

function drawCheckmark(ctx: CanvasRenderingContext2D) {
    const cx = W / 2;
    const cy = H * 0.42;
    const r = 180;

    for (let i = 8; i > 0; i--) {
        const t = i / 8;
        ctx.strokeStyle = `rgba(34, 197, 94, ${0.06 * t})`;
        ctx.lineWidth = 18 + i * 8;
        ctx.beginPath();
        ctx.arc(cx, cy, r + i * 3, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.shadowBlur = 40;
    ctx.shadowColor = GREEN_GLOW;

    ctx.strokeStyle = GREEN_CORE;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = GREEN_SOFT;
    ctx.lineWidth = 30;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 80, cy + 14);
    ctx.lineTo(cx - 14, cy + 78);
    ctx.lineTo(cx + 92, cy - 60);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
}

function drawCaption(ctx: CanvasRenderingContext2D) {
    const cx = W / 2;
    const baseY = H * 0.42 + 180 + 130;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#EAFBF1';
    ctx.font = 'bold 92px "Inter","Helvetica Neue",sans-serif';
    ctx.shadowBlur = 32;
    ctx.shadowColor = 'rgba(34, 197, 94, 0.7)';
    ctx.fillText('PROJET DÉPLOYÉ', cx, baseY);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(127, 247, 167, 0.7)';
    ctx.font = '24px "Consolas","Menlo","Courier New",monospace';
    ctx.fillText('// BUILD 1.0.0  ·  ALL CHECKS PASSED', cx, baseY + 60);

    const barX = W / 2 - 240;
    const barY = baseY + 110;
    const barW = 480;
    const barH = 6;

    ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = GREEN_CORE;
    ctx.shadowBlur = 18;
    ctx.shadowColor = GREEN_GLOW;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(127, 247, 167, 0.55)';
    ctx.font = '20px "Consolas","Menlo","Courier New",monospace';
    ctx.fillText('100%', cx, barY + 38);
    ctx.textAlign = 'left';
}

export function createDeployedScreenTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    drawBackground(ctx);
    drawCheckmark(ctx);
    drawCaption(ctx);
    drawCornerHud(ctx);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
}
