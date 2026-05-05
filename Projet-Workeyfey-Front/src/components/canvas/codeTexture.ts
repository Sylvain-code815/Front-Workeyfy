import * as THREE from 'three';

const SAMPLE_LINES = [
    'function process(data) {',
    '  const result = data.map((x) => x * 2 + 1);',
    '  return result.filter(Boolean);',
    '}',
    '',
    'const cache = new Map();',
    'cache.set("session", value);',
    'await fetch(url).then(res => res.json());',
    'if (status === 200) {',
    '  console.log("OK");',
    '} else {',
    '  throw new Error("Failed: " + code);',
    '}',
    'export default class Service {',
    '  #private = null;',
    '  constructor(opts) { this.opts = opts; }',
    '  async init() { return this.opts; }',
    '}',
    '0x4F2A B7C1 9D3E F0A8 1C7B 5A92',
    '0xC4B7 8E1A 2F09 D5B6 7E32 A14F',
    'const x = await db.query(`SELECT *`);',
    'router.post("/api/v1/data", handler);',
    'try { await run(); } catch (e) { log(e); }',
    'use strict;',
    'import { fn } from "lib/utils";',
    'export const compute = () => 1;',
    '<App initialState={state} />',
    '> npm install',
    '> [✓] 1247 packages installed in 4.2s',
    '> system.boot();',
    '> mount /dev/sda1 -> /mnt/data',
    '> [OK] kernel ready',
    '> [INFO] 1024MB free, uptime 12h',
    '> exec --watch ./src',
    '> compiling... done in 312ms',
    'render(props) { return <View />; }',
    'const subscription = obs.subscribe();',
    'return () => subscription.unsubscribe();',
    'const next = state.length + 1;',
    'dispatch({ type: "FETCH_OK", payload });',
    'useEffect(() => { return cleanup; }, []);',
    'const id = crypto.randomUUID();',
    'GET /api/users -> 200 OK (12ms)',
    'POST /api/auth -> 401 Unauthorized',
    'WebSocket: connection established',
    'WebSocket: heartbeat 30s',
    '[trace] enter <Component />',
    '[trace] exit <Component /> in 0.3ms',
    '> git commit -m "feat: ship it"',
    '> git push origin main',
    '[main 4a7e9c2] feat: ship it',
    'pipeline.run({ retries: 3 });',
    'queue.enqueue(job, { priority: 1 });',
    'redis.set("k", JSON.stringify(v));',
    'await Promise.all(tasks.map(run));',
    'for (const item of stream) yield item;',
];

export function createCodeTexture(): THREE.CanvasTexture {
    const w = 512;
    const h = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');

    ctx.fillStyle = '#000810';
    ctx.fillRect(0, 0, w, h);

    ctx.font = '11px "Consolas", "Menlo", "Courier New", monospace';
    ctx.textBaseline = 'top';

    const lineHeight = 12;
    const totalLines = Math.floor(h / lineHeight);

    let seed = 7;
    const rand = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    for (let i = 0; i < totalLines; i++) {
        const line = SAMPLE_LINES[Math.floor(rand() * SAMPLE_LINES.length)];
        const indent = Math.floor(rand() * 4);
        const r = rand();
        if (r < 0.12) ctx.fillStyle = '#00ffd0';
        else if (r < 0.24) ctx.fillStyle = '#7adfff';
        else if (r < 0.34) ctx.fillStyle = '#a8ff66';
        else ctx.fillStyle = '#00ff88';
        ctx.globalAlpha = rand() < 0.18 ? 0.35 : 0.92;
        ctx.fillText(line, 6 + indent * 4, i * lineHeight);
    }

    ctx.globalAlpha = 1;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 16;
    texture.repeat.set(1, 1);
    return texture;
}
