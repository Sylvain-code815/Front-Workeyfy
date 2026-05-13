import * as THREE from 'three';

const W = 720;
const H = 1280;

const ACCENT: Record<'cyan' | 'green' | 'violet', string> = {
    cyan: '#00E5FF',
    // Was magenta (#FF1B8D). Saturated FiveM-style green so the per-slide
    // accents tie back to the page-wide blue/green data-fluid theme.
    green: '#4ADE80',
    violet: '#7C5CFF',
};

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

export interface WindowMockupOpts {
    image: HTMLImageElement;
    title: string;
    appName: string;
    accent: 'cyan' | 'green' | 'violet';
}

/**
 * Draws a portrait phone-screen sized canvas containing a miniature macOS
 * window (traffic lights + title bar + the slide screenshot). Returned as a
 * THREE.CanvasTexture ready to plug into an emissive material — the iPhone
 * screen ends up displaying a miniature of the desktop mockup, so PC and
 * phone visibly show the same app.
 */
export function createWindowMockupTexture(opts: WindowMockupOpts): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const accent = ACCENT[opts.accent];

    // ── Phone-screen background — soft gradient, accent-tinted. ──
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#020a14');
    bg.addColorStop(0.5, '#04111f');
    bg.addColorStop(1, '#020912');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Faint scanlines for texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

    // ── iOS status bar ──
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 30px -apple-system, "SF Pro Text", "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('9:41', 50, 50);

    // signal bars
    const sbX = W - 130;
    for (let i = 0; i < 4; i++) {
        const bh = 5 + i * 3.5;
        ctx.fillRect(sbX + i * 8, 50 - bh / 2 + 2, 5, bh);
    }
    // wifi
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(W - 80, 56, 8, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W - 80, 56, 13, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
    // battery
    roundRect(ctx, W - 50, 41, 30, 16, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();

    // ── App header ──
    ctx.fillStyle = accent;
    ctx.font = 'bold 36px -apple-system, "SF Pro Display", sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(opts.appName.toUpperCase(), 50, 130);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '20px -apple-system, "SF Pro Text", sans-serif';
    ctx.fillText('Live preview · Same site', 50, 180);

    // accent underline
    const underY = 218;
    const grad = ctx.createLinearGradient(50, underY, W - 50, underY);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(50, underY, W - 100, 3);

    // ── Mini macOS window — landscape card centred on the phone screen ──
    const cardW = W - 100;
    const cardAspect = 16 / 10;
    const cardH = cardW / cardAspect;
    const cardX = 50;
    const cardY = 280;
    const tbH = 44;
    const radius = 18;

    // Drop shadow underneath the card
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    roundRect(ctx, cardX + 4, cardY + 12, cardW, cardH, radius);
    ctx.fill();

    // Card body
    ctx.fillStyle = '#1a1a1d';
    roundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.fill();

    // Title bar
    ctx.save();
    roundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.clip();
    const tbGrad = ctx.createLinearGradient(0, cardY, 0, cardY + tbH);
    tbGrad.addColorStop(0, '#2c2c30');
    tbGrad.addColorStop(1, '#232326');
    ctx.fillStyle = tbGrad;
    ctx.fillRect(cardX, cardY, cardW, tbH);
    // separator line
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(cardX, cardY + tbH, cardW, 1);
    ctx.restore();

    // Traffic lights
    const lights: Array<[string, string]> = [
        ['#FF5F57', '#E04D45'],
        ['#FEBC2E', '#D9A11D'],
        ['#28C840', '#1FA630'],
    ];
    lights.forEach(([fill, ring], i) => {
        const cx = cardX + 24 + i * 24;
        const cy = cardY + tbH / 2;
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ring;
        ctx.lineWidth = 0.5;
        ctx.stroke();
    });

    // Title text in title bar
    ctx.fillStyle = 'rgba(244, 248, 255, 0.78)';
    ctx.font = '500 18px -apple-system, "SF Pro Text", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.title, cardX + cardW / 2, cardY + tbH / 2);

    // Screenshot — clipped inside the card body (below the title bar)
    const imgY = cardY + tbH;
    const imgH = cardH - tbH;
    ctx.save();
    ctx.beginPath();
    // bottom-rounded clip for the image so it follows the card shape
    ctx.moveTo(cardX, imgY);
    ctx.lineTo(cardX + cardW, imgY);
    ctx.lineTo(cardX + cardW, cardY + cardH - radius);
    ctx.arcTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH, radius);
    ctx.lineTo(cardX + radius, cardY + cardH);
    ctx.arcTo(cardX, cardY + cardH, cardX, cardY + cardH - radius, radius);
    ctx.closePath();
    ctx.clip();

    // Cover-fit the image into the area
    const ratioImg = opts.image.width / opts.image.height;
    const ratioBox = cardW / imgH;
    let drawW = cardW;
    let drawH = imgH;
    let drawX = cardX;
    let drawY = imgY;
    if (ratioImg > ratioBox) {
        // image wider than box → scale by height, crop sides
        drawH = imgH;
        drawW = imgH * ratioImg;
        drawX = cardX - (drawW - cardW) / 2;
    } else {
        drawW = cardW;
        drawH = cardW / ratioImg;
        drawY = imgY - (drawH - imgH) / 2;
    }
    ctx.drawImage(opts.image, drawX, drawY, drawW, drawH);

    // Accent-tinted vignette over the screenshot — keeps the slide identity
    // legible at thumbnail size without hiding the image.
    const tintGrad = ctx.createLinearGradient(cardX, imgY, cardX + cardW, imgY + imgH);
    tintGrad.addColorStop(0, hexToRgba(accent, 0.35));
    tintGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = tintGrad;
    ctx.fillRect(cardX, imgY, cardW, imgH);
    ctx.restore();

    // Card border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    roundRect(ctx, cardX + 0.5, cardY + 0.5, cardW - 1, cardH - 1, radius);
    ctx.stroke();

    // ── Strip below the card with caption ──
    const stripY = cardY + cardH + 36;
    const stripH = 110;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    roundRect(ctx, cardX, stripY, cardW, stripH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    roundRect(ctx, cardX + 0.5, stripY + 0.5, cardW - 1, stripH - 1, 14);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = accent;
    ctx.font = 'bold 22px -apple-system, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('SAME APP · MOBILE', cardX + 22, stripY + 22);

    ctx.fillStyle = 'rgba(244, 248, 255, 0.7)';
    ctx.font = '18px -apple-system, sans-serif';
    ctx.fillText(opts.appName + ' for iPhone', cardX + 22, stripY + 56);

    // Status pill on the right
    const pillW = 110;
    const pillH = 30;
    const pillX = cardX + cardW - pillW - 18;
    const pillY = stripY + (stripH - pillH) / 2;
    ctx.fillStyle = hexToRgba(accent, 0.18);
    roundRect(ctx, pillX, pillY, pillW, pillH, 15);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LIVE', pillX + pillW / 2, pillY + pillH / 2);

    // ── Tab bar at the bottom of the phone screen ──
    const tabH = 110;
    const tabY = H - tabH;
    const tabGrad = ctx.createLinearGradient(0, tabY, 0, H);
    tabGrad.addColorStop(0, 'rgba(2, 10, 20, 0)');
    tabGrad.addColorStop(0.4, 'rgba(2, 10, 20, 0.95)');
    tabGrad.addColorStop(1, 'rgba(2, 10, 20, 1)');
    ctx.fillStyle = tabGrad;
    ctx.fillRect(0, tabY, W, tabH);

    const tabs = ['Home', 'Apps', 'Live', 'Profile'];
    const tw = W / tabs.length;
    tabs.forEach((label, i) => {
        const cx = i * tw + tw / 2;
        const active = i === 2;
        const fg = active ? accent : 'rgba(255, 255, 255, 0.45)';
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(cx, tabY + 50, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = active ? 'bold 16px -apple-system' : '16px -apple-system';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, cx, tabY + 64);
    });

    // Home indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    roundRect(ctx, W / 2 - 70, H - 14, 140, 5, 3);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
}

function hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
