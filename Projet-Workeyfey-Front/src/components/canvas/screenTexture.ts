import * as THREE from 'three';

export function createScreenTexture(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');

    const r0 = 0x9c;
    const g0 = 0x92;
    const b0 = 0x80;
    const noiseAmplitude = 22;

    const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
        const n = (Math.random() - 0.5) * noiseAmplitude;
        imgData.data[i] = Math.max(0, Math.min(255, r0 + n));
        imgData.data[i + 1] = Math.max(0, Math.min(255, g0 + n));
        imgData.data[i + 2] = Math.max(0, Math.min(255, b0 + n));
        imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    const cell = 8;
    for (let x = cell; x < size; x += cell) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, size);
        ctx.stroke();
    }
    for (let y = cell; y < size; y += cell) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(size, y + 0.5);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 8;
    return tex;
}
