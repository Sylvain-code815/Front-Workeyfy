import * as THREE from 'three';

export function createBraidTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    const cell = 16;
    ctx.lineCap = 'round';
    ctx.lineWidth = 9;

    for (let y = 0; y < size; y += cell) {
        for (let x = 0; x < size; x += cell) {
            const phase = ((x / cell) + (y / cell)) % 2;
            const grad = ctx.createLinearGradient(x, y, x + cell, y + cell);
            grad.addColorStop(0, '#003344');
            grad.addColorStop(0.5, '#00f0ff');
            grad.addColorStop(1, '#003344');
            ctx.strokeStyle = grad;

            ctx.beginPath();
            if (phase === 0) {
                ctx.moveTo(x, y + cell);
                ctx.lineTo(x + cell, y);
            } else {
                ctx.moveTo(x, y);
                ctx.lineTo(x + cell, y + cell);
            }
            ctx.stroke();
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 12);
    texture.anisotropy = 4;
    return texture;
}
