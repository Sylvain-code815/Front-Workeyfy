import * as THREE from 'three';

const W = 720;
const H = 1280;

const CYAN = '#00E5FF';
const CYAN_DIM = 'rgba(0, 229, 255, 0.55)';
const CYAN_FADE = 'rgba(0, 229, 255, 0.18)';
const TEXT = '#E6F7FF';
const TEXT_MUTED = 'rgba(230, 247, 255, 0.55)';

function drawBackground(ctx: CanvasRenderingContext2D) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#020a14');
    g.addColorStop(0.5, '#04111f');
    g.addColorStop(1, '#020912');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(0, 229, 255, 0.04)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
}

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawStatusBar(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = TEXT;
    ctx.font = 'bold 26px "SF Pro Text","Helvetica Neue",sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('9:41', 38, 44);

    ctx.fillStyle = TEXT;
    const rightX = W - 30;
    const cy = 44;

    // signal bars
    for (let i = 0; i < 4; i++) {
        const bh = 6 + i * 4;
        ctx.fillRect(rightX - 84 + i * 8, cy - bh / 2 + 2, 5, bh);
    }
    // wifi arc
    ctx.strokeStyle = TEXT;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(rightX - 40, cy + 4, 8, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightX - 40, cy + 4, 13, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
    // battery
    roundRect(ctx, rightX - 26, cy - 9, 22, 14, 3);
    ctx.fillStyle = TEXT;
    ctx.fill();
    ctx.fillRect(rightX - 4, cy - 5, 2, 6);
}

function drawDynamicIslandSpace(_ctx: CanvasRenderingContext2D) {
    // Reserved blank area where the Dynamic Island sits — UI starts below it.
    // The phone GLB has its own physical island; we just don't draw on top.
}

function drawHeader(ctx: CanvasRenderingContext2D, top: number) {
    ctx.fillStyle = CYAN;
    ctx.font = 'bold 44px "SF Pro Display","Helvetica Neue",sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('QUANTUM CRM', 38, top);

    ctx.fillStyle = TEXT_MUTED;
    ctx.font = '22px "SF Pro Text","Helvetica Neue",sans-serif';
    ctx.fillText('Mobile Dashboard · Live', 38, top + 56);

    // accent line
    const lineY = top + 96;
    const grad = ctx.createLinearGradient(38, lineY, W - 38, lineY);
    grad.addColorStop(0, CYAN);
    grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(38, lineY, W - 76, 3);
}

type Kpi = { label: string; value: string; delta: string; up: boolean };

function drawKpiTiles(ctx: CanvasRenderingContext2D, top: number) {
    const kpis: Kpi[] = [
        { label: 'PIPELINE', value: '€842K', delta: '+12.4%', up: true },
        { label: 'WON / WK', value: '37', delta: '+5', up: true },
        { label: 'MRR', value: '€68K', delta: '+3.1%', up: true },
        { label: 'CHURN', value: '1.8%', delta: '-0.4%', up: false },
    ];

    const pad = 38;
    const gap = 18;
    const tileW = (W - pad * 2 - gap) / 2;
    const tileH = 130;

    kpis.forEach((k, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = pad + col * (tileW + gap);
        const y = top + row * (tileH + gap);

        // tile bg
        ctx.fillStyle = 'rgba(0, 229, 255, 0.06)';
        roundRect(ctx, x, y, tileW, tileH, 16);
        ctx.fill();
        ctx.strokeStyle = CYAN_FADE;
        ctx.lineWidth = 1;
        roundRect(ctx, x, y, tileW, tileH, 16);
        ctx.stroke();

        // label
        ctx.fillStyle = TEXT_MUTED;
        ctx.font = 'bold 16px "SF Pro Text",sans-serif';
        ctx.fillText(k.label, x + 18, y + 18);

        // value
        ctx.fillStyle = TEXT;
        ctx.font = 'bold 38px "SF Pro Display",sans-serif';
        ctx.fillText(k.value, x + 18, y + 50);

        // delta pill
        const deltaColor = k.up ? '#22e6a4' : '#ff5e6c';
        ctx.fillStyle = k.up ? 'rgba(34, 230, 164, 0.18)' : 'rgba(255, 94, 108, 0.18)';
        const pillW = 78;
        const pillH = 26;
        roundRect(ctx, x + 18, y + tileH - pillH - 14, pillW, pillH, 13);
        ctx.fill();
        ctx.fillStyle = deltaColor;
        ctx.font = 'bold 16px "SF Pro Text",sans-serif';
        ctx.fillText(k.delta, x + 28, y + tileH - pillH - 8);
    });
}

function drawAreaChart(ctx: CanvasRenderingContext2D, top: number) {
    const x = 38;
    const w = W - 76;
    const h = 220;

    // bg card
    ctx.fillStyle = 'rgba(0, 229, 255, 0.05)';
    roundRect(ctx, x, top, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = CYAN_FADE;
    ctx.lineWidth = 1;
    roundRect(ctx, x, top, w, h, 18);
    ctx.stroke();

    ctx.fillStyle = TEXT_MUTED;
    ctx.font = 'bold 16px "SF Pro Text",sans-serif';
    ctx.fillText('PIPELINE — 30 DAYS', x + 18, top + 18);
    ctx.fillStyle = TEXT;
    ctx.font = 'bold 22px "SF Pro Display",sans-serif';
    ctx.fillText('+12.4%', x + w - 90, top + 16);

    const chartTop = top + 60;
    const chartBottom = top + h - 24;
    const chartH = chartBottom - chartTop;
    const chartLeft = x + 18;
    const chartRight = x + w - 18;
    const chartW = chartRight - chartLeft;

    // grid lines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
        const gy = chartTop + (i / 3) * chartH;
        ctx.beginPath();
        ctx.moveTo(chartLeft, gy);
        ctx.lineTo(chartRight, gy);
        ctx.stroke();
    }

    // sample series
    const points = 24;
    const series: number[] = [];
    let v = 0.4;
    for (let i = 0; i < points; i++) {
        v += (Math.sin(i * 0.7) * 0.06) + 0.018 + (i % 5 === 0 ? 0.04 : 0);
        v = Math.max(0.05, Math.min(0.95, v));
        series.push(v);
    }
    const sx = (i: number) => chartLeft + (i / (points - 1)) * chartW;
    const sy = (val: number) => chartBottom - val * chartH;

    // fill
    const fillGrad = ctx.createLinearGradient(0, chartTop, 0, chartBottom);
    fillGrad.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
    fillGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.moveTo(chartLeft, chartBottom);
    series.forEach((val, i) => ctx.lineTo(sx(i), sy(val)));
    ctx.lineTo(chartRight, chartBottom);
    ctx.closePath();
    ctx.fill();

    // stroke
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    series.forEach((val, i) => {
        if (i === 0) ctx.moveTo(sx(i), sy(val));
        else ctx.lineTo(sx(i), sy(val));
    });
    ctx.stroke();

    // last-point dot
    const lastX = sx(points - 1);
    const lastY = sy(series[points - 1]);
    ctx.fillStyle = '#04111f';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
    ctx.stroke();
}

type Activity = { initials: string; name: string; status: string; tone: 'cyan' | 'green' | 'amber' };

function drawActivity(ctx: CanvasRenderingContext2D, top: number) {
    ctx.fillStyle = TEXT;
    ctx.font = 'bold 22px "SF Pro Display",sans-serif';
    ctx.fillText('Recent Activity', 38, top);

    ctx.fillStyle = CYAN;
    ctx.font = 'bold 16px "SF Pro Text",sans-serif';
    ctx.fillText('See all', W - 110, top + 4);

    const rows: Activity[] = [
        { initials: 'AC', name: 'Acme Corp · €42K', status: 'Won', tone: 'green' },
        { initials: 'NV', name: 'Novabit · €18K', status: 'Negotiation', tone: 'cyan' },
        { initials: 'KR', name: 'Krios Labs · €7K', status: 'Pending', tone: 'amber' },
    ];

    const rowH = 76;
    const startY = top + 36;
    rows.forEach((r, i) => {
        const y = startY + i * rowH;

        // avatar
        ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
        ctx.beginPath();
        ctx.arc(38 + 26, y + 26, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = CYAN;
        ctx.font = 'bold 18px "SF Pro Text",sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(r.initials, 38 + 26, y + 32);
        ctx.textAlign = 'left';

        // name
        ctx.fillStyle = TEXT;
        ctx.font = 'bold 22px "SF Pro Text",sans-serif';
        ctx.fillText(r.name, 38 + 64, y + 18);

        ctx.fillStyle = TEXT_MUTED;
        ctx.font = '17px "SF Pro Text",sans-serif';
        ctx.fillText('updated 2m ago', 38 + 64, y + 46);

        // status pill
        const palette: Record<Activity['tone'], { bg: string; fg: string }> = {
            cyan: { bg: 'rgba(0, 229, 255, 0.18)', fg: CYAN },
            green: { bg: 'rgba(34, 230, 164, 0.18)', fg: '#22e6a4' },
            amber: { bg: 'rgba(255, 196, 0, 0.18)', fg: '#ffc400' },
        };
        const p = palette[r.tone];
        const txtW = ctx.measureText(r.status).width + 28;
        const px = W - 38 - txtW;
        ctx.fillStyle = p.bg;
        roundRect(ctx, px, y + 18, txtW, 28, 14);
        ctx.fill();
        ctx.fillStyle = p.fg;
        ctx.font = 'bold 16px "SF Pro Text",sans-serif';
        ctx.fillText(r.status, px + 14, y + 24);
    });
}

function drawTabBar(ctx: CanvasRenderingContext2D) {
    const barH = 110;
    const barY = H - barH;
    const grad = ctx.createLinearGradient(0, barY, 0, H);
    grad.addColorStop(0, 'rgba(2, 10, 20, 0)');
    grad.addColorStop(0.4, 'rgba(2, 10, 20, 0.95)');
    grad.addColorStop(1, 'rgba(2, 10, 20, 1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, barY, W, barH);

    ctx.strokeStyle = CYAN_FADE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(38, barY + 18);
    ctx.lineTo(W - 38, barY + 18);
    ctx.stroke();

    const tabs = ['Home', 'Pipeline', 'Customers', 'Profile'];
    const tabW = W / tabs.length;
    tabs.forEach((label, i) => {
        const cx = i * tabW + tabW / 2;
        const active = i === 0;
        const fg = active ? CYAN : TEXT_MUTED;

        // icon dot
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(cx, barY + 50, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = fg;
        ctx.font = active
            ? 'bold 18px "SF Pro Text",sans-serif'
            : '18px "SF Pro Text",sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, barY + 70);
        ctx.textAlign = 'left';
    });

    // home indicator
    ctx.fillStyle = TEXT;
    roundRect(ctx, W / 2 - 70, H - 14, 140, 5, 3);
    ctx.fill();
}

function drawCornerHud(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = CYAN_DIM;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 18);
    ctx.lineTo(20, 60);
    ctx.stroke();
    ctx.fillStyle = 'rgba(127, 247, 232, 0.55)';
    ctx.font = '12px "Consolas","Menlo",monospace';
    ctx.fillText('// QUANTUM.LIVE 0x4F', 28, 28);
}

export function createQuantumCrmMobileTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    drawBackground(ctx);
    drawStatusBar(ctx);
    drawDynamicIslandSpace(ctx);
    drawHeader(ctx, 130);
    drawKpiTiles(ctx, 260);
    drawAreaChart(ctx, 580);
    drawActivity(ctx, 850);
    drawTabBar(ctx);
    drawCornerHud(ctx);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
}
