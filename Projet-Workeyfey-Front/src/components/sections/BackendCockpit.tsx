import {
    forwardRef,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import './BackendCockpit.css';
// Editorial-list / Apple-like override pass. Activated only when a
// parent wraps the cockpit in `<div className="Atelier">…</div>`. Costs
// nothing when absent (selectors won't match).
import './BackendCockpit.atelier.css';

// Web Vibration API — Android Chrome / Edge implement it, iOS Safari is
// silently a no-op. Guarded so SSR / Firefox iOS never throw. Pattern
// kept short (≤ 25ms) so it reads as a "Mainframe clack", never a buzz.
function haptic(pattern: number | number[]) {
    if (typeof navigator === 'undefined') return;
    const v = navigator.vibrate?.bind(navigator);
    if (!v) return;
    try {
        v(pattern);
    } catch {
        /* some browsers throw when called outside a user gesture stack */
    }
}

// Treat the device as "touch-first" when the OS reports no precise hover.
// Drives the dashboard's interaction mode: hover-follow popover on mouse,
// tap-to-inspect on touch. Re-evaluated on resize so plugging in a mouse
// to a tablet flips us back to hover mode mid-session.
function detectTouchMode(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(hover: none)').matches;
}

type Service = { name: string; status: string };

type Slide = {
    id: string;
    title: string;
    domain: string;
    services: Service[];
};

const STACK_POOL = [
    'NODE.JS / RUST / GRPC',
    'GO / POSTGRES / NATS',
    'PYTHON / FASTAPI / REDIS',
    'KOTLIN / KAFKA / K8S',
    'ELIXIR / PHOENIX / EDGE',
    'TS / DENO / SQLITE',
    'RUST / TOKIO / WASM',
];

// Request lifecycle stages — drives the Flow diagram. Each entry reads
// like a station on the request path so a visitor can trace what really
// happens when a user hits the API. Stack labels mirror what an SRE
// would announce in a postmortem ("we sit behind nginx, JWT on Argon2,
// Node cluster, Redis cache, Postgres write-replica…").
type FlowStage = {
    id: 'client' | 'lb' | 'auth' | 'service' | 'cache' | 'db';
    label: string;
    stack: string;
    detail: string;
    branch?: 'cache' | 'db';
};
const FLOW_STAGES: FlowStage[] = [
    { id: 'client', label: 'CLIENT', stack: 'TLS 1.3 · HTTP/3', detail: 'edge ingress · 220ms RTT median' },
    { id: 'lb', label: 'LOAD BALANCER', stack: 'nginx 1.27', detail: 'least_conn · keepalive 64' },
    { id: 'auth', label: 'AUTH MIDDLEWARE', stack: 'JWT · Argon2id', detail: 'token TTL 15m · refresh window 30d' },
    { id: 'service', label: 'SERVICE', stack: 'Node 22 LTS · cluster', detail: 'autoscale 6→16 · p99 budget 250ms' },
    { id: 'cache', label: 'CACHE', stack: 'Redis 7.4', detail: 'TTL 60s · maxmemory-policy allkeys-lru', branch: 'cache' },
    { id: 'db', label: 'DATABASE', stack: 'PostgreSQL 16', detail: 'rw-primary · 20 conn pool · WAL streaming', branch: 'db' },
];

const REGION_POOL = [
    'EU-WEST-3',
    'US-EAST-1',
    'AP-SOUTHEAST-2',
    'EU-CENTRAL-1',
    'US-WEST-2',
    'SA-EAST-1',
];

const REPLICAS_INITIAL = 12;
const REPLICAS_MIN = 6;
const REPLICAS_MAX = 16;

// Magnetic hover: how far the cursor reaches each magnetic element (px)
// and how strongly the element follows. Subtle by design.
const MAG_RADIUS = 90;
const MAG_PULL = 0.25;
const MAG_LERP = 0.18;

function hashId(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h;
}

function deriveSpark(id: string): number[] {
    const h = hashId(id);
    const pts: number[] = [];
    let s = h || 1;
    for (let i = 0; i < 24; i++) {
        s = (s * 1664525 + 1013904223) >>> 0;
        pts.push((s & 0xffff) / 0xffff);
    }
    return pts;
}

// Deterministic technical readout — same (slide, service) always yields
// the same values so the tooltip reads like a real system snapshot, not
// random noise. Each value mirrors something an SRE actually checks:
// runtime, version, build time, uptime, memory, replicas, region.
const RUNTIME_LABELS = [
    'Node.js LTS',
    'Go 1.22',
    'Python 3.12',
    'Kotlin / JVM 21',
    'Elixir / OTP 26',
    'Deno 1.40',
    'Rust / Tokio',
];

const STATUS_DOTS = ['ok', 'warn', 'idle'] as const;
type StatusDot = (typeof STATUS_DOTS)[number];

function buildHud(
    slideHash: number,
    serviceName: string,
    idx: number,
    slideStackIdx: number,
) {
    let s = (slideHash + idx * 31 + serviceName.length * 17) >>> 0;
    const next = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s;
    };

    const major = 16 + (next() % 6);
    const minor = next() % 16;
    const patch = next() % 24;
    const version = `v${major}.${minor}.${patch}`;

    // Runtime label is offset from the slide's main stack so the carousel
    // of services in one slide doesn't all read the same runtime.
    const runtime = RUNTIME_LABELS[(slideStackIdx + idx) % RUNTIME_LABELS.length];

    const buildSec = 1.4 + (next() % 64) / 10;
    const build = `${buildSec.toFixed(1)}s`;

    const uptimeDays = 1 + (next() % 28);
    const uptimeHours = next() % 24;
    const uptime = `${uptimeDays}d ${uptimeHours}h`;

    const memUsed = 64 + (next() % 320);
    const memTotal = memUsed < 256 ? 512 : 1024;
    const mem = `${memUsed} / ${memTotal} MB`;

    const replA = 4 + (next() % 12);
    const replB = replA + (next() % 4) + 1;
    const replicas = `${replA}/${replB}`;

    const region = REGION_POOL[(next() >>> 4) % REGION_POOL.length];

    const statusRoll = next() % 10;
    // Strongly skew towards 'ok' — most boxes should look healthy.
    const status: StatusDot =
        statusRoll >= 8 ? 'warn' : statusRoll === 7 ? 'idle' : 'ok';

    // Live-feeling SRE metrics so the HUD reads like a real Grafana panel.
    const rpsRaw = 240 + (next() % 4200);
    const requestLoad =
        rpsRaw >= 1000
            ? `${(rpsRaw / 1000).toFixed(rpsRaw >= 10000 ? 0 : 1)}k req/s`
            : `${rpsRaw} req/s`;

    // Error rate skewed low — warn nodes get a 0.8–3.0% range, others stay
    // sub-1% so the green dots feel believably healthy.
    const errSeed = next() % 1000;
    const errPct = status === 'warn' ? 0.8 + (errSeed % 220) / 100 : errSeed / 1000;
    const errorRate = `${errPct.toFixed(2)}%`;

    const latencyMs = 18 + (next() % 64);
    const snippetCmd = serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    return {
        version,
        runtime,
        build,
        uptime,
        mem,
        replicas,
        region,
        status,
        latencyMs,
        snippetCmd,
        requestLoad,
        errorRate,
    };
}

// Cyberpunk-style glitch reveal: every character cycles through random
// glyphs at ~60fps until it "locks in" left-to-right. Resolves in under
// 240ms so it stays well below the 400ms motion budget. The randomness
// is intentional and not seed-controlled — the locked output is always
// the same `value`, only the in-between frames jitter.
const GLITCH_CHARS = '!<>-_\\/[]{}—=+*^?#________ABCDEF0123456789';
function useGlitchReveal(value: string, durationMs = 220): string {
    const [shown, setShown] = useState('');
    useEffect(() => {
        if (!value) {
            setShown('');
            return;
        }
        const start = performance.now();
        let raf: number | null = null;
        const tick = () => {
            const t = Math.min(1, (performance.now() - start) / durationMs);
            const locked = Math.floor(t * value.length);
            let out = value.slice(0, locked);
            for (let i = locked; i < value.length; i++) {
                // Preserve spaces / digits at their position so width stays stable.
                const ch = value[i];
                if (ch === ' ') out += ' ';
                else out += GLITCH_CHARS[(Math.random() * GLITCH_CHARS.length) | 0];
            }
            setShown(out);
            if (t < 1) raf = requestAnimationFrame(tick);
            else setShown(value);
        };
        raf = requestAnimationFrame(tick);
        return () => {
            if (raf !== null) cancelAnimationFrame(raf);
        };
    }, [value, durationMs]);
    return shown;
}

// Splits a formatted metric like "1.2k req/s" or "3d 14h" into a sequence
// of text/number tokens. Number tokens remember their decimal precision so
// the tween renders "0.04% → 0.21%" rather than "0.040000000004%".
type MetricToken =
    | { kind: 'text'; text: string }
    | { kind: 'num'; value: number; decimals: number };
const METRIC_NUM_RE = /-?\d+(?:\.\d+)?/g;
function parseMetric(s: string): MetricToken[] {
    const tokens: MetricToken[] = [];
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    METRIC_NUM_RE.lastIndex = 0;
    while ((m = METRIC_NUM_RE.exec(s)) !== null) {
        if (m.index > lastIdx) tokens.push({ kind: 'text', text: s.slice(lastIdx, m.index) });
        const raw = m[0];
        const dot = raw.indexOf('.');
        tokens.push({
            kind: 'num',
            value: parseFloat(raw),
            decimals: dot === -1 ? 0 : raw.length - dot - 1,
        });
        lastIdx = m.index + raw.length;
    }
    if (lastIdx < s.length) tokens.push({ kind: 'text', text: s.slice(lastIdx) });
    return tokens;
}
function formatMetric(tokens: MetricToken[]): string {
    let out = '';
    for (const t of tokens) {
        out += t.kind === 'text' ? t.text : t.value.toFixed(t.decimals);
    }
    return out;
}

// Tween-on-change for KPI strings: when `target` swaps to a new formatted
// value, each numeric segment animates from its currently-displayed value
// to the new target (easeOutCubic, default 220ms — same budget as the
// glitch reveal it replaces). Non-numeric segments stay static. On first
// mount we count up from 60% of target so the HUD doesn't appear inert.
function useMetricTween(target: string, durationMs = 220): string {
    const targetTokens = useMemo(() => parseMetric(target), [target]);
    const [shown, setShown] = useState(() =>
        formatMetric(
            targetTokens.map((tok) =>
                tok.kind === 'text'
                    ? tok
                    : { kind: 'num', value: tok.value * 0.6, decimals: tok.decimals },
            ),
        ),
    );
    const shownRef = useRef(shown);
    shownRef.current = shown;

    useEffect(() => {
        const prevNums = parseMetric(shownRef.current)
            .filter((t): t is Extract<MetricToken, { kind: 'num' }> => t.kind === 'num')
            .map((t) => t.value);

        const start = performance.now();
        let raf: number | null = null;
        const tick = () => {
            const t = Math.min(1, (performance.now() - start) / durationMs);
            const eased = 1 - Math.pow(1 - t, 3);
            let numIdx = 0;
            const current = targetTokens.map<MetricToken>((tok) => {
                if (tok.kind === 'text') return tok;
                const from = prevNums[numIdx] ?? tok.value * 0.6;
                numIdx += 1;
                return {
                    kind: 'num',
                    value: from + (tok.value - from) * eased,
                    decimals: tok.decimals,
                };
            });
            setShown(formatMetric(current));
            if (t < 1) raf = requestAnimationFrame(tick);
            else setShown(target);
        };
        raf = requestAnimationFrame(tick);
        return () => {
            if (raf !== null) cancelAnimationFrame(raf);
        };
    }, [target, durationMs, targetTokens]);

    return shown;
}

// Centralized synergy hook — translates the LOAD slider value (0..100)
// into the system pressure metrics consumed by all three zones (Flow,
// Gauges, Live Tail). The shapes are intentional:
//   - p99 grows quadratically so the sparkline dramatically spikes only
//     when the system is genuinely under load
//   - heap saturates near 0.94 (we don't want a "100% RAM" frame that
//     reads as crashed)
//   - errorBias is zero until 80% and then ramps fast — gives the user
//     a "danger zone" beat when they push the slider past 4/5ths
function useSystemPressure(load: number) {
    return useMemo(() => {
        const t = Math.max(0, Math.min(1, load / 100));
        return {
            t,
            p50: Math.round(20 + t * 60),
            p99: Math.round(45 + t * t * 380),
            throughput: Math.round(200 + t * 4800),
            heapPct: Math.min(0.94, 0.32 + t * 0.62),
            poolActive: Math.round(2 + t * 18),
            poolWaiting: t > 0.8 ? Math.round((t - 0.8) * 8) : 0,
            particleRate: 1 + t * 7,
            gcInterval: Math.max(1500, 6000 - t * 4500),
            errorBias: t > 0.8 ? (t - 0.8) * 5 : 0,
        };
    }, [load]);
}

// ── Live Tail log entries ─────────────────────────────────────────
type LogLevel = 'info' | 'warn' | 'error';
type LogEntry = { id: number; ts: string; level: LogLevel; source: string; message: string };
let LOG_SEQ = 0;
function nextLogId(): number {
    LOG_SEQ = (LOG_SEQ + 1) >>> 0;
    return LOG_SEQ;
}
function stampNow(): string {
    const d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
        .map((v) => v.toString().padStart(2, '0'))
        .join(':');
}
function mkLog(level: LogLevel, source: string, message: string): LogEntry {
    return { id: nextLogId(), ts: stampNow(), level, source, message };
}
// Random source/message library, weighted by level. Cache-miss + slow
// query lines spike when pool saturation is high. Auth + circuit-open
// errors spike when errorBias > 0.
const LOG_INFO_LINES: ((p: { poolActive: number; throughput: number; p99: number }) => [string, string])[] = [
    (p) => ['router', `dispatched request · ${p.throughput} req/s in-flight`],
    () => ['auth.0', `JWT validated · sub=usr_${(Math.random() * 0xffff | 0).toString(16).padStart(4, '0')}…7f3a · 4ms`],
    (p) => ['cache.0', `HIT key=user:profile · ttl=${30 + (Math.random() * 30 | 0)}s`],
    (p) => ['gw', `response 200 · upstream=${p.p99}ms p99`],
    () => ['health', `pod-${1 + (Math.random() * 11 | 0)} ready · liveness 2ms · readiness 5ms`],
    (p) => ['pool', `connection ${p.poolActive}/20 leased · idle=${20 - p.poolActive}`],
    () => ['workers', `goroutine pool stable · gc pause 1.2ms`],
];
const LOG_WARN_LINES: (() => [string, string])[] = [
    () => ['cache.1', `MISS · queried postgres-rw · key=session:rotate`],
    () => ['pool', `connection pool at high watermark · slow query lock 42ms`],
    () => ['retry', `upstream 503 · backoff 250ms · attempt 2/5`],
    () => ['gc', `Major GC pause 38ms · heap 78% post-collection`],
    () => ['ratelimit', `client throttled · 429 returned · 12 hits in 1s`],
];
const LOG_ERROR_LINES: (() => [string, string])[] = [
    () => ['auth.0', `JWT signature mismatch · kid=k_${(Math.random() * 0xffff | 0).toString(16)}`],
    () => [`pod-${1 + (Math.random() * 11 | 0)}`, `timeout · circuit open · downstream=db-rw`],
    () => ['service', `EAI_AGAIN on resolve · upstream=cache.1 · falling back to db`],
    () => ['db', `deadlock detected · victim txn aborted · retry queued`],
];
function pickLog(
    level: LogLevel,
    pressure: { poolActive: number; throughput: number; p99: number }
): LogEntry {
    const arr =
        level === 'info' ? LOG_INFO_LINES
        : level === 'warn' ? LOG_WARN_LINES
        : LOG_ERROR_LINES;
    const fn = arr[(Math.random() * arr.length) | 0] as
        | ((p: { poolActive: number; throughput: number; p99: number }) => [string, string])
        | (() => [string, string]);
    // Both signatures accept the pressure object; the simpler ones ignore it.
    const out = (fn as (p: { poolActive: number; throughput: number; p99: number }) => [string, string])(pressure);
    return mkLog(level, out[0], out[1]);
}

function ExternalLinkIcon() {
    return (
        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path
                d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
}

function RefreshIcon() {
    return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path
                d="M3 12a9 9 0 0 1 15.5-6.3M21 4v5h-5M21 12a9 9 0 0 1-15.5 6.3M3 20v-5h5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
}

type Press = { ripples: number; trigger: number };

function useRipple(): [Press, () => void] {
    const [press, setPress] = useState<Press>({ ripples: 0, trigger: 0 });
    const fire = () =>
        setPress((p) => ({ ripples: p.ripples + 1, trigger: p.trigger + 1 }));
    return [press, fire];
}

// ── Edge data-streams ──────────────────────────────────────────────
// Twin vertical noise tracks pinned to the cockpit edges. Generated
// once per mount with a deterministic seed so the rows stay stable
// while the carousel rotates between slides.
function buildStream(seed: number, lines: number, alphabet: string): string[] {
    let s = (seed || 1) >>> 0;
    const out: string[] = [];
    for (let i = 0; i < lines; i++) {
        // 6-char "row" of pseudo-random alphabet chars.
        let row = '';
        for (let k = 0; k < 6; k++) {
            s = (s * 1664525 + 1013904223) >>> 0;
            row += alphabet[s % alphabet.length];
        }
        out.push(row);
    }
    return out;
}

function EdgeStream({ side, seed }: { side: 'left' | 'right'; seed: number }) {
    const lines = useMemo(
        () =>
            buildStream(
                seed,
                42,
                side === 'left' ? '01' : '0123456789ABCDEF'
            ),
        [seed, side]
    );
    return (
        <div
            className={`Cockpit-edge Cockpit-edge--${side}`}
            aria-hidden="true"
        >
            <div className="Cockpit-edge-track">
                {lines.map((row, i) => (
                    <span key={`a${i}`}>{row}</span>
                ))}
                {lines.map((row, i) => (
                    <span key={`b${i}`}>{row}</span>
                ))}
            </div>
        </div>
    );
}

// Fake tail -f stream that lives next to the HUD. Generated per (slide,
// service) so each hover gets its own "scrollback". The CSS animation
// scrolls the doubled list infinitely; the content stays seeded.
const LOG_VERBS = [
    'pull', 'push', 'sync', 'reap', 'flush', 'drain', 'patch', 'route',
    'cache', 'index', 'audit', 'mint', 'rotate', 'ack', 'nack', 'commit',
];
const LOG_TARGETS = [
    'core', 'edge', 'auth', 'cache.0', 'cache.1', 'shard.a', 'shard.b',
    'queue', 'meta', 'gw',
];

function buildLogStream(seed: number, lines: number): string[] {
    let s = (seed || 1) >>> 0;
    const next = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s;
    };
    const out: string[] = [];
    for (let i = 0; i < lines; i++) {
        const t = next() % 86400;
        const hh = Math.floor(t / 3600).toString().padStart(2, '0');
        const mm = Math.floor((t % 3600) / 60).toString().padStart(2, '0');
        const ss = (t % 60).toString().padStart(2, '0');
        const verb = LOG_VERBS[next() % LOG_VERBS.length];
        const target = LOG_TARGETS[next() % LOG_TARGETS.length];
        const ms = (next() % 99) + 1;
        out.push(`${hh}:${mm}:${ss} ${verb}/${target} ${ms}ms`);
    }
    return out;
}

// Holographic scanner waveform — 56 sin-points warped with a quick
// noise floor so the line "twitches" rather than rolling smoothly.
function buildWavePath(seed: number): string {
    let s = (seed || 1) >>> 0;
    const next = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s;
    };
    const W = 200;
    const H = 30;
    const N = 64;
    const pts: string[] = [];
    for (let i = 0; i <= N; i++) {
        const t = i / N;
        const phase = t * Math.PI * 6;
        const noise = ((next() & 0xff) / 0xff - 0.5) * 0.35;
        const y = H / 2 + (Math.sin(phase) + noise) * (H * 0.35);
        const x = t * W;
        pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(2)}`);
    }
    // Duplicate the path so the panning animation has continuity at
    // wrap-around (translateX(-40px) loops cleanly).
    for (let i = 0; i <= N; i++) {
        const t = i / N;
        const phase = (t + 1) * Math.PI * 6;
        const noise = ((next() & 0xff) / 0xff - 0.5) * 0.35;
        const y = H / 2 + (Math.sin(phase) + noise) * (H * 0.35);
        const x = (t + 1) * W;
        pts.push(`L ${x.toFixed(1)} ${y.toFixed(2)}`);
    }
    return pts.join(' ');
}

// HUD popover content — six dense SRE metrics with per-character glitch
// reveal on the four "live" values (uptime, req_load, err_rate, mem).
// The card is framed by four neon brackets (top-left, top-right, etc.),
// a live waveform sits below the metrics, and a side log column streams
// fake tail -f output to the right of the card. All three additions
// turn the tooltip into a proper "holographic scanner".
function HudCard({
    hud,
    serviceName,
    seed,
}: {
    hud: ReturnType<typeof buildHud>;
    serviceName: string;
    seed: number;
}) {
    // Cross-fade snapshot: when serviceName changes we fade the inner
    // body out (80ms), then swap to the new data and fade back in. The
    // outer card + brackets stay mounted so the position glide is not
    // interrupted. Total swap ≈ 160ms — feels like a Dynamic Island
    // morph rather than a hard cut between tiles.
    const [shown, setShown] = useState({ hud, serviceName, seed });
    const [fading, setFading] = useState(false);
    useEffect(() => {
        if (serviceName === shown.serviceName) {
            // Same service — pressure / load may have rebuilt `hud`
            // but the user did not switch tile. Update silently so
            // glitch-reveals keep tracking live values.
            setShown({ hud, serviceName, seed });
            return;
        }
        setFading(true);
        const t = window.setTimeout(() => {
            setShown({ hud, serviceName, seed });
            setFading(false);
        }, 80);
        return () => window.clearTimeout(t);
    }, [serviceName, hud, seed]);

    const version = useGlitchReveal(shown.hud.version);
    const uptime = useMetricTween(shown.hud.uptime);
    const requestLoad = useMetricTween(shown.hud.requestLoad);
    const errorRate = useMetricTween(shown.hud.errorRate);
    const mem = useMetricTween(shown.hud.mem);
    const logs = useMemo(() => buildLogStream(shown.seed, 14), [shown.seed]);
    const wavePath = useMemo(
        () => buildWavePath(shown.seed ^ 0xb5297a4d),
        [shown.seed]
    );

    return (
        <div className="Cockpit-tileHud" role="tooltip">
            <span className="Cockpit-tileHud-bracket Cockpit-tileHud-bracket--tl" aria-hidden="true" />
            <span className="Cockpit-tileHud-bracket Cockpit-tileHud-bracket--tr" aria-hidden="true" />
            <span className="Cockpit-tileHud-bracket Cockpit-tileHud-bracket--bl" aria-hidden="true" />
            <span className="Cockpit-tileHud-bracket Cockpit-tileHud-bracket--br" aria-hidden="true" />

            <div
                className={`Cockpit-tileHud-body${fading ? ' is-fading' : ''}`}
            >
            <div className="Cockpit-tileHud-header">
                <span className={`Cockpit-tileHud-dot Cockpit-tileHud-dot--${shown.hud.status}`} />
                <span className="Cockpit-tileHud-svc">{shown.serviceName}</span>
                <span className="Cockpit-tileHud-ver">{version}</span>
            </div>
            <dl className="Cockpit-tileHud-list">
                <div>
                    <dt>RUNTIME</dt>
                    <dd>{shown.hud.runtime}</dd>
                </div>
                <div>
                    <dt>UPTIME</dt>
                    <dd>{uptime}</dd>
                </div>
                <div>
                    <dt>REQ_LOAD</dt>
                    <dd>{requestLoad}</dd>
                </div>
                <div>
                    <dt>ERR_RATE</dt>
                    <dd
                        className={
                            shown.hud.status === 'warn'
                                ? 'Cockpit-tileHud-val--warn'
                                : undefined
                        }
                    >
                        {errorRate}
                    </dd>
                </div>
                <div>
                    <dt>MEMORY</dt>
                    <dd>{mem}</dd>
                </div>
                <div>
                    <dt>REPLICAS</dt>
                    <dd>{shown.hud.replicas}</dd>
                </div>
            </dl>

            <div className="Cockpit-tileHud-wave" aria-hidden="true">
                <span className="Cockpit-tileHud-wave-grid" />
                <svg viewBox="0 0 200 30" preserveAspectRatio="none">
                    <path className="Cockpit-tileHud-wave-path" d={wavePath} />
                </svg>
            </div>

            <div className="Cockpit-tileHud-snippet">
                $ kubectl logs {shown.hud.snippetCmd} -n {shown.hud.region.toLowerCase()}
                {'  '}
                <span className="Cockpit-tileHud-snippet-ok">
                    ✓ Ready · {shown.hud.latencyMs}ms
                </span>
            </div>
            </div>

            <div className="Cockpit-tileHud-logCol" aria-hidden="true">
                <div className="Cockpit-tileHud-logCol-track">
                    {logs.map((l, i) => (
                        <span key={`a${i}`}>{l}</span>
                    ))}
                    {logs.map((l, i) => (
                        <span key={`b${i}`}>{l}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Heap meter ───────────────────────────────────────────────────
// Tiny horizontal bar with a saw-tooth "GC teeth" pattern overlaid as
// CSS background. The fill width is driven by pressure.heapPct and the
// fill also "breathes" — a periodic dip mimics garbage collection
// pauses (gcInterval shrinks under load).
function HeapMeter({ pct, gcInterval }: { pct: number; gcInterval: number }) {
    const [breath, setBreath] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => {
            setBreath((b) => b + 1);
        }, gcInterval);
        return () => window.clearInterval(id);
    }, [gcInterval]);
    // Each GC ticks the breath; the fill drops 14% then recovers via CSS.
    const drop = breath % 2 === 1 ? 0.14 : 0;
    const fill = Math.max(0.04, Math.min(0.98, pct - drop));
    const fillPct = (fill * 100).toFixed(0) + '%';
    const totalMb = pct > 0.7 ? 1024 : 512;
    const usedMb = Math.round(pct * totalMb);
    return (
        <div className="Cockpit-heap" aria-label={`Heap ${usedMb}/${totalMb}MB`}>
            <div className="Cockpit-heap-track">
                <span className="Cockpit-heap-fill" style={{ width: fillPct }} />
                <span className="Cockpit-heap-teeth" aria-hidden="true" />
            </div>
            <span className="Cockpit-heap-val">
                {usedMb}<span className="Cockpit-heap-total">/{totalMb}MB</span>
            </span>
        </div>
    );
}

// ── DB connection pool widget ─────────────────────────────────────
// 20 slots laid out in a row. Each slot is idle (grey), active (cyan)
// or waiting (orange). Active count comes from pressure.poolActive; the
// last `waiting` slots blink to read as "queued".
function DbPoolWidget({ active, waiting }: { active: number; waiting: number }) {
    const total = 20;
    const slots = Array.from({ length: total }, (_, i) => {
        if (i < active) return 'active';
        if (i < active + waiting) return 'wait';
        return 'idle';
    });
    return (
        <div className="Cockpit-pool" aria-label={`DB pool ${active}/${total}`}>
            <div className="Cockpit-pool-slots">
                {slots.map((s, i) => (
                    <span
                        key={i}
                        className={`Cockpit-pool-slot Cockpit-pool-slot--${s}`}
                        style={{ '--slot-i': i } as React.CSSProperties}
                    />
                ))}
            </div>
            <span className="Cockpit-pool-val">
                {active}<span className="Cockpit-pool-total">/{total}</span>
            </span>
        </div>
    );
}

// ── Live Tail panel ───────────────────────────────────────────────
// A persistent kubectl-logs-style stream. Receives a buffered list of
// LogEntry items (FIFO, capped upstream). Renders the last `visible`
// lines bottom-aligned with a top fade gradient so the older lines
// dissolve as new ones arrive. Pure presentational component — all
// log generation lives in the parent so events stay coordinated.
const LEVEL_LABEL: Record<LogLevel, string> = {
    info: 'INFO',
    warn: 'WARN',
    error: 'ERROR',
};
function LiveTail({ logs }: { logs: LogEntry[] }) {
    const visible = 8;
    const tail = logs.slice(-visible);
    return (
        <section className="Cockpit-livetail" aria-label="Live system log">
            <header className="Cockpit-panelHead Cockpit-livetail-head">
                <span className="Cockpit-panelDot" />
                LIVE TAIL · stdout
                <span className="Cockpit-livetail-cmd">$ kubectl logs -f --all-containers</span>
            </header>
            <ol className="Cockpit-livetail-list">
                {tail.map((l) => (
                    <li
                        key={l.id}
                        className={`Cockpit-livetail-line Cockpit-livetail-line--${l.level}`}
                    >
                        <span className="Cockpit-livetail-ts">{l.ts}</span>
                        <span className="Cockpit-livetail-level">[{LEVEL_LABEL[l.level]}]</span>
                        <span className="Cockpit-livetail-source">{l.source}</span>
                        <span className="Cockpit-livetail-msg">·&nbsp;{l.message}</span>
                    </li>
                ))}
            </ol>
        </section>
    );
}

// ── Flow diagram ──────────────────────────────────────────────────
// SVG schematic of the request lifecycle. Each FlowStage is rendered
// as a labelled node along an inverted-Y horizontal path: a main line
// runs Client → LB → Auth → Service → Cache; from Service a short
// secondary segment drops to DB. The diagram emits request particles
// at a rate proportional to pressure.particleRate; under heavy load
// some particles colour red before reaching DB to signal timeouts.
const FLOW_VIEW = { w: 1000, h: 220 };
// Coordinates carefully placed: client (left edge), then evenly stepped
// stations across, with cache to the right and DB below service.
const FLOW_POS: Record<FlowStage['id'], { x: number; y: number }> = {
    client: { x: 70, y: 110 },
    lb: { x: 245, y: 110 },
    auth: { x: 430, y: 110 },
    service: { x: 620, y: 110 },
    cache: { x: 870, y: 64 },
    db: { x: 870, y: 168 },
};

type FlowParticle = {
    id: number;
    born: number;
    duration: number;
    target: 'cache' | 'db';
    failed: boolean;
};
let FLOW_PARTICLE_SEQ = 0;

function FlowDiagram({
    pressure,
    onNodeClick,
    activeService,
    deployBurst,
    crashBurst,
}: {
    pressure: ReturnType<typeof useSystemPressure>;
    onNodeClick?: (stage: FlowStage) => void;
    activeService?: string | null;
    deployBurst: number;
    crashBurst: number;
}) {
    const [particles, setParticles] = useState<FlowParticle[]>([]);
    const [, setNow] = useState(0);
    const rafRef = useRef<number | null>(null);
    const lastSpawnRef = useRef<number>(performance.now());
    const lastFrameRef = useRef<number>(performance.now());

    // Continuous spawn + GC loop. Spawn rate = particleRate /s; lifetime
    // is fixed (~1800ms full traversal). Old particles auto-evict when
    // age > duration.
    useEffect(() => {
        const tick = () => {
            const now = performance.now();
            lastFrameRef.current = now;
            const interval = 1000 / Math.max(0.1, pressure.particleRate);
            if (now - lastSpawnRef.current >= interval) {
                lastSpawnRef.current = now;
                FLOW_PARTICLE_SEQ = (FLOW_PARTICLE_SEQ + 1) >>> 0;
                // Pin the particle object (and its id) at spawn time. Reading
                // FLOW_PARTICLE_SEQ inside the updater would race: with React
                // automatic batching, multiple ticks can queue updaters before
                // a render, and each lazy read would resolve to the LATEST
                // SEQ value → identical keys → "two children with key X".
                const target: 'cache' | 'db' = Math.random() < 0.55 ? 'cache' : 'db';
                const failed = pressure.errorBias > 0 && Math.random() < pressure.errorBias * 0.5;
                const spawned: FlowParticle = {
                    id: FLOW_PARTICLE_SEQ,
                    born: now,
                    duration: 1600 + Math.random() * 600,
                    target,
                    failed,
                };
                setParticles((prev) => {
                    const next = prev.filter((p) => now - p.born < p.duration);
                    next.push(spawned);
                    return next.slice(-60); // hard cap
                });
            } else {
                // periodic frame even without spawn so React can re-render
                // particles that finished and need eviction
                setNow(now);
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [pressure.particleRate, pressure.errorBias]);

    // DEPLOY burst — push a quick salvo of 24 particles, staggered, of
    // mixed targets. The deployBurst prop bumps to retrigger.
    useEffect(() => {
        if (deployBurst === 0) return;
        const now = performance.now();
        const burst: FlowParticle[] = [];
        for (let i = 0; i < 24; i++) {
            FLOW_PARTICLE_SEQ = (FLOW_PARTICLE_SEQ + 1) >>> 0;
            burst.push({
                id: FLOW_PARTICLE_SEQ,
                born: now + i * 35,
                duration: 1400 + Math.random() * 500,
                target: i % 2 === 0 ? 'cache' : 'db',
                failed: false,
            });
        }
        setParticles((prev) => [...prev, ...burst].slice(-80));
    }, [deployBurst]);

    // CRASH burst — 8 failing particles in quick succession. Visualises
    // the impact of a pod going down before the orchestrator log catches
    // up. All target DB so they fan out across the busy half of the path.
    useEffect(() => {
        if (crashBurst === 0) return;
        const now = performance.now();
        const burst: FlowParticle[] = [];
        for (let i = 0; i < 8; i++) {
            FLOW_PARTICLE_SEQ = (FLOW_PARTICLE_SEQ + 1) >>> 0;
            burst.push({
                id: FLOW_PARTICLE_SEQ,
                born: now + i * 80,
                duration: 1200 + Math.random() * 280,
                target: i % 3 === 0 ? 'cache' : 'db',
                failed: true,
            });
        }
        setParticles((prev) => [...prev, ...burst].slice(-80));
    }, [crashBurst]);

    // Pre-compute the path lengths for each segment (for particle
    // positioning). Three segments: client→lb, lb→auth, auth→service,
    // then branch to cache or db.
    const buildPath = (target: 'cache' | 'db'): string => {
        const c = FLOW_POS.client;
        const lb = FLOW_POS.lb;
        const a = FLOW_POS.auth;
        const s = FLOW_POS.service;
        const end = FLOW_POS[target];
        return `M ${c.x} ${c.y} L ${lb.x} ${lb.y} L ${a.x} ${a.y} L ${s.x} ${s.y} L ${end.x} ${end.y}`;
    };
    const pathCache = buildPath('cache');
    const pathDb = buildPath('db');

    // Compute particle (x,y) at time t (0..1) by sampling waypoints.
    const computeParticleXY = (p: FlowParticle, now: number) => {
        const t = Math.max(0, Math.min(1, (now - p.born) / p.duration));
        const c = FLOW_POS.client;
        const lb = FLOW_POS.lb;
        const a = FLOW_POS.auth;
        const s = FLOW_POS.service;
        const end = FLOW_POS[p.target];
        // 4 segments — segment progress mapping
        const segs = [
            { from: c, to: lb },
            { from: lb, to: a },
            { from: a, to: s },
            { from: s, to: end },
        ];
        const lens = segs.map((sg) => Math.hypot(sg.to.x - sg.from.x, sg.to.y - sg.from.y));
        const total = lens.reduce((acc, v) => acc + v, 0);
        const targetDist = t * total;
        let acc = 0;
        for (let i = 0; i < segs.length; i++) {
            if (targetDist <= acc + lens[i]) {
                const localT = (targetDist - acc) / lens[i];
                const x = segs[i].from.x + (segs[i].to.x - segs[i].from.x) * localT;
                const y = segs[i].from.y + (segs[i].to.y - segs[i].from.y) * localT;
                // Failed particles drop colour to red after the auth step.
                const failedHere = p.failed && t > 0.55;
                return { x, y, t, failedHere };
            }
            acc += lens[i];
        }
        return { x: end.x, y: end.y, t, failedHere: p.failed };
    };

    const now = performance.now();
    return (
        <div className="Cockpit-flow" aria-label="Request lifecycle">
            <svg
                className="Cockpit-flow-svg"
                viewBox={`0 0 ${FLOW_VIEW.w} ${FLOW_VIEW.h}`}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id="cockpit-flow-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="rgba(127,227,255,0.65)" />
                        <stop offset="100%" stopColor="rgba(74,222,128,0.7)" />
                    </linearGradient>
                </defs>
                {/* Static path strokes — drawn as a track and a brighter
                    foreground layer so it reads structural, not decorative. */}
                <path d={pathCache} className="Cockpit-flow-track" />
                <path d={pathDb} className="Cockpit-flow-track" />
                <path d={pathCache} className="Cockpit-flow-line" />
                <path d={pathDb} className="Cockpit-flow-line" />

                {/* Particles — rendered as circles in SVG space so they
                    follow the path geometry exactly under non-uniform scale. */}
                {particles.map((p) => {
                    const { x, y, t, failedHere } = computeParticleXY(p, now);
                    if (t >= 1) return null;
                    return (
                        <circle
                            key={p.id}
                            cx={x}
                            cy={y}
                            r={failedHere ? 4.5 : 3.4}
                            className={`Cockpit-flow-particle${failedHere ? ' Cockpit-flow-particle--fail' : ''}`}
                        />
                    );
                })}
            </svg>
            {/* Nodes as DOM so labels stay crisp and click targets generous. */}
            <div className="Cockpit-flow-nodes">
                {FLOW_STAGES.map((stage) => {
                    const pos = FLOW_POS[stage.id];
                    const xPct = (pos.x / FLOW_VIEW.w) * 100;
                    const yPct = (pos.y / FLOW_VIEW.h) * 100;
                    const isActive = stage.id === 'service' && !!activeService;
                    return (
                        <button
                            type="button"
                            key={stage.id}
                            className={`Cockpit-flow-node Cockpit-flow-node--${stage.id}${isActive ? ' Cockpit-flow-node--active' : ''}`}
                            style={{ left: `${xPct}%`, top: `${yPct}%` }}
                            onClick={() => onNodeClick?.(stage)}
                            data-magnetic=""
                        >
                            <span className="Cockpit-flow-node-dot" aria-hidden="true" />
                            <span className="Cockpit-flow-node-label">{stage.label}</span>
                            <span className="Cockpit-flow-node-stack">
                                {stage.id === 'service' && activeService
                                    ? activeService
                                    : stage.stack}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

const BackendCockpit = forwardRef<HTMLDivElement, { slide: Slide }>(
    function BackendCockpit({ slide }, ref) {
        const h = useMemo(() => hashId(slide.id), [slide.id]);
        const initialStackIdx = h % STACK_POOL.length;
        const region = REGION_POOL[(h >>> 8) % REGION_POOL.length];
        const sparkPoints = useMemo(() => deriveSpark(slide.id), [slide.id]);
        const initialLoad = 30 + (h % 40);

        const [stackIdx, setStackIdx] = useState(initialStackIdx);
        const [load, setLoad] = useState(initialLoad);
        const [replicas, setReplicas] = useState(REPLICAS_INITIAL);
        const [downReplicas, setDownReplicas] = useState<Set<number>>(new Set());
        const [serviceStates, setServiceStates] = useState<Record<string, 'ok' | 'maint'>>(() =>
            Object.fromEntries(slide.services.map((s) => [s.name, 'ok' as const]))
        );
        const [deployPulse, setDeployPulse] = useState(0);
        const [clackKey, setClackKey] = useState<Record<string, number>>({});
        const [stackSpin, setStackSpin] = useState(0);
        const [hoveredTile, setHoveredTile] = useState<string | null>(null);
        // DEPLOY shockwave anchor — every click bumps `key` so the SVG
        // remounts and the keyframe restarts cleanly. Null = not visible.
        const [shockwave, setShockwave] = useState<{ x: number; y: number; key: number } | null>(null);
        // Touch-first mode (no precise hover). On touch, the popover is
        // anchored above the tile and a first tap inspects, second tap acts.
        const [touchMode, setTouchMode] = useState<boolean>(() => detectTouchMode());
        // Anchor for the touch-mode popover: the tile rect at inspect time.
        const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
        // Mobile-only progressive disclosure — the services pad lives behind
        // a "DÉTAILS TECHNIQUES" button under 768px so the metrics vitales
        // breathe. CSS keeps the desktop layout untouched; this state only
        // flips the root class.
        const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

        // ── Live tail buffer (FIFO, capped at 30 entries) ──────────
        const [logs, setLogs] = useState<LogEntry[]>([]);
        // Bump-counter used to retrigger the FlowDiagram's DEPLOY burst.
        const [deployBurstSeq, setDeployBurstSeq] = useState(0);
        // Same idea — fires a small salvo of failing (red) particles when
        // FORCE ERROR is clicked, so the crash is visible in the Flow zone
        // even before the orchestrator log catches up.
        const [crashBurstSeq, setCrashBurstSeq] = useState(0);
        // Per-pod phase. Keyed by replica index.
        //   'crash' (red blink)  · 'drain' (amber) ·
        //   'term'  (grey)       · 'start' (cyan)  · then back to ok.
        // Drives both the rolling restart and the self-healing cycle.
        const [rollingPhase, setRollingPhase] = useState<
            Record<number, 'crash' | 'drain' | 'term' | 'start'>
        >({});
        // Currently active flow stage popover (null = none).
        const [flowFocus, setFlowFocus] = useState<FlowStage | null>(null);

        const restartTimers = useRef<number[]>([]);
        // Two-phase hover: a tile becomes a *candidate* on mouseenter, then
        // *commits* only after a short dwell with the cursor away from the
        // tile's edge. This prevents the HUD from ping-ponging when the
        // cursor sits exactly between two tiles — the candidate is reset
        // whenever the cursor crosses back, and the timer never fires.
        const pendingTileRef = useRef<string | null>(null);
        const hoveredTileRef = useRef<string | null>(null);
        const commitTimer = useRef<number | null>(null);
        const clearTimer = useRef<number | null>(null);
        const tiltWrapRef = useRef<HTMLDivElement>(null);
        const popoverRef = useRef<HTMLDivElement>(null);
        const rootRef = useRef<HTMLDivElement>(null);
        const tileRefs = useRef<Record<string, HTMLButtonElement | null>>({});
        const bodyRef = useRef<HTMLDivElement>(null);
        // Combine the parent's forwardRef with our local rootRef so we can
        // hand it back to GSAP while still reading the element internally.
        const setRoots = (node: HTMLDivElement | null) => {
            rootRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        };

        useEffect(() => {
            setStackIdx(h % STACK_POOL.length);
            setLoad(30 + (h % 40));
            setReplicas(REPLICAS_INITIAL);
            setDownReplicas(new Set());
            setServiceStates(
                Object.fromEntries(slide.services.map((s) => [s.name, 'ok' as const]))
            );
            setDeployPulse(0);
            setClackKey({});
            setStackSpin(0);
            setHoveredTile(null);
            setLogs([]);
            setDeployBurstSeq(0);
            setCrashBurstSeq(0);
            setRollingPhase({});
            setFlowFocus(null);
        }, [slide.id, slide.services, h]);

        useEffect(() => {
            return () => {
                restartTimers.current.forEach((t) => window.clearTimeout(t));
                if (commitTimer.current !== null) window.clearTimeout(commitTimer.current);
                if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
            };
        }, []);

        // Mirror the hoveredTile state into a ref so the hover-hysteresis
        // handlers (which are stable callbacks per render) can read the
        // currently committed value without re-creating themselves.
        useEffect(() => {
            hoveredTileRef.current = hoveredTile;
        }, [hoveredTile]);

        // Watch (hover: none) so a docked iPad swapping to a Bluetooth mouse
        // flips back to hover mode without a reload.
        useEffect(() => {
            if (typeof window === 'undefined' || !window.matchMedia) return;
            const mq = window.matchMedia('(hover: none)');
            const onChange = () => setTouchMode(mq.matches);
            mq.addEventListener?.('change', onChange);
            return () => mq.removeEventListener?.('change', onChange);
        }, []);

        // Mobile drawer handlers — wrapped so the haptic guard + state set
        // live next to one another. open() bumps a short "clack" pattern,
        // close() a slightly longer one to mark the dismissal.
        const openMobileDrawer = () => {
            if (mobileDrawerOpen) return;
            haptic(6);
            setMobileDrawerOpen(true);
        };
        const closeMobileDrawer = () => {
            if (!mobileDrawerOpen) return;
            haptic([8, 24]);
            setMobileDrawerOpen(false);
        };

        // ESC closes the drawer + cancels the inspect popover hovered with it.
        useEffect(() => {
            if (!mobileDrawerOpen) return;
            const onKey = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    setMobileDrawerOpen(false);
                    setHoveredTile(null);
                    setAnchorRect(null);
                }
            };
            document.addEventListener('keydown', onKey);
            return () => document.removeEventListener('keydown', onKey);
        }, [mobileDrawerOpen]);

        // Drawer is mobile-only; if the viewport flips back to hover-capable
        // (rotation on a tablet w/ keyboard, dock to mouse, etc.) force it
        // closed so desktop never inherits an open overlay.
        useEffect(() => {
            if (!touchMode && mobileDrawerOpen) {
                setMobileDrawerOpen(false);
            }
        }, [touchMode, mobileDrawerOpen]);

        // Tap-outside to dismiss the inspector on touch — the popover is
        // pointer-events:none, so any tap that doesn't land on the current
        // tile dismisses it cleanly.
        useEffect(() => {
            if (!touchMode || !hoveredTile) return;
            const onDocPointer = (e: PointerEvent) => {
                const tile = tileRefs.current[hoveredTile];
                if (tile && e.target instanceof Node && tile.contains(e.target)) return;
                setHoveredTile(null);
                setAnchorRect(null);
            };
            // Defer registration so the same tap that opened the popover
            // doesn't immediately close it.
            const id = window.setTimeout(() => {
                document.addEventListener('pointerdown', onDocPointer, true);
            }, 0);
            return () => {
                window.clearTimeout(id);
                document.removeEventListener('pointerdown', onDocPointer, true);
            };
        }, [touchMode, hoveredTile]);

        // ─── Magnetic hover on [data-magnetic] children ──────────────
        useEffect(() => {
            const root = rootRef.current;
            if (!root) return;

            type Slot = { tx: number; ty: number; cx: number; cy: number };
            const slots = new WeakMap<HTMLElement, Slot>();
            let raf: number | null = null;
            let mouseX = 0;
            let mouseY = 0;

            const onMove = (e: MouseEvent) => {
                mouseX = e.clientX;
                mouseY = e.clientY;
                if (raf === null) raf = requestAnimationFrame(tick);
            };

            const tick = () => {
                const elements = root.querySelectorAll<HTMLElement>('[data-magnetic]');
                let stillMoving = 0;
                elements.forEach((el) => {
                    let s = slots.get(el);
                    if (!s) {
                        s = { tx: 0, ty: 0, cx: 0, cy: 0 };
                        slots.set(el, s);
                    }
                    const rect = el.getBoundingClientRect();
                    const ccx = rect.left + rect.width / 2;
                    const ccy = rect.top + rect.height / 2;
                    const dx = mouseX - ccx;
                    const dy = mouseY - ccy;
                    const dist = Math.hypot(dx, dy);
                    if (dist < MAG_RADIUS) {
                        const f = MAG_PULL * (1 - dist / MAG_RADIUS);
                        s.tx = dx * f;
                        s.ty = dy * f;
                    } else {
                        s.tx = 0;
                        s.ty = 0;
                    }
                    s.cx += (s.tx - s.cx) * MAG_LERP;
                    s.cy += (s.ty - s.cy) * MAG_LERP;
                    el.style.setProperty('--mag-x', `${s.cx.toFixed(2)}px`);
                    el.style.setProperty('--mag-y', `${s.cy.toFixed(2)}px`);
                    if (Math.abs(s.tx - s.cx) > 0.1 || Math.abs(s.ty - s.cy) > 0.1) {
                        stillMoving++;
                    }
                });
                if (stillMoving > 0) {
                    raf = requestAnimationFrame(tick);
                } else {
                    raf = null;
                }
            };

            window.addEventListener('mousemove', onMove);
            return () => {
                window.removeEventListener('mousemove', onMove);
                if (raf !== null) cancelAnimationFrame(raf);
            };
        }, []);

        // ─── Popover follows the cursor with a small smooth lag ─────
        // Mouse mode only — touch devices anchor the popover above the
        // inspected tile instead (see the next effect).
        useEffect(() => {
            if (touchMode) return;
            const pop = popoverRef.current;
            if (!hoveredTile || !pop) return;

            const state = { tx: 0, ty: 0, cx: 0, cy: 0, initialized: false };
            let raf: number | null = null;

            const tick = () => {
                if (state.initialized) {
                    state.cx += (state.tx - state.cx) * 0.32;
                    state.cy += (state.ty - state.cy) * 0.32;
                } else {
                    state.cx = state.tx;
                    state.cy = state.ty;
                    state.initialized = true;
                }
                pop.style.left = `${state.cx}px`;
                pop.style.top = `${state.cy}px`;
                const dx = Math.abs(state.tx - state.cx);
                const dy = Math.abs(state.ty - state.cy);
                // Toggle is-moving so CSS can drop the expensive
                // backdrop-filter(blur 20px) while the popover glides.
                // 4px threshold avoids flicker on micro-jitters.
                if (dx > 4 || dy > 4) {
                    if (!pop.classList.contains('is-moving')) {
                        pop.classList.add('is-moving');
                    }
                }
                if (dx > 0.5 || dy > 0.5) {
                    raf = requestAnimationFrame(tick);
                } else {
                    pop.classList.remove('is-moving');
                    raf = null;
                }
            };

            const onMove = (e: MouseEvent) => {
                const popRect = pop.getBoundingClientRect();
                const w = popRect.width || 340;
                const hh = popRect.height || 220;
                // 28px diagonal offset from the cursor, clipped so neither
                // the 420px card nor the 240px log column on its right side
                // can spill past the viewport edges.
                const LOG_COL_W = 254;
                const maxX = window.innerWidth - w - 8 - LOG_COL_W;
                const maxY = window.innerHeight - hh - 8;
                state.tx = Math.min(maxX, e.clientX + 28);
                state.ty = Math.min(maxY, e.clientY + 28);
                if (raf === null) raf = requestAnimationFrame(tick);
            };

            document.addEventListener('mousemove', onMove);
            return () => {
                document.removeEventListener('mousemove', onMove);
                if (raf !== null) cancelAnimationFrame(raf);
            };
        }, [hoveredTile, touchMode]);

        // ─── Touch mode: anchor popover above the inspected tile and
        //     play a GSAP "deploy" entrance (scale + opacity + slide up).
        useEffect(() => {
            if (!touchMode) return;
            const pop = popoverRef.current;
            if (!hoveredTile || !pop || !anchorRect) return;

            // Wait one frame so the portal has a measurable size.
            let raf: number | null = requestAnimationFrame(() => {
                raf = null;
                const popRect = pop.getBoundingClientRect();
                const margin = 10;
                let top = anchorRect.top - popRect.height - margin;
                // Flip below the tile if the popover would clip the top of
                // the viewport (e.g. tile near the section header).
                if (top < 8) top = anchorRect.bottom + margin;
                let left = anchorRect.left + anchorRect.width / 2 - popRect.width / 2;
                left = Math.max(8, Math.min(window.innerWidth - popRect.width - 8, left));
                pop.style.left = `${left}px`;
                pop.style.top = `${top}px`;

                gsap.fromTo(
                    pop,
                    {
                        opacity: 0,
                        scale: 0.82,
                        y: 6,
                        transformOrigin: '50% 100%',
                    },
                    {
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        duration: 0.32,
                        ease: 'back.out(1.7)',
                        overwrite: 'auto',
                    },
                );
            });

            return () => {
                if (raf !== null) cancelAnimationFrame(raf);
                gsap.killTweensOf(pop);
            };
        }, [touchMode, hoveredTile, anchorRect]);

        const currentStack = STACK_POOL[stackIdx % STACK_POOL.length];
        // Pressure mirrors the LOAD slider — fed to all three zones.
        const pressure = useSystemPressure(load);
        const liveLatency = pressure.p99;

        // P99 polyline — high-amplitude curve, scales with load.
        const sparkPolylineP99 = useMemo(() => {
            const W = 220;
            const H = 36;
            const n = sparkPoints.length;
            const amp = 0.35 + (load / 100) * 0.85;
            return sparkPoints
                .map((p, i) => {
                    const x = (i / (n - 1)) * W;
                    const centered = (p - 0.5) * amp + 0.5;
                    const y = H - centered * H * 0.9 - H * 0.05;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(' ');
        }, [sparkPoints, load]);

        // P50 polyline — flatter, sits below the P99 line.
        const sparkPolylineP50 = useMemo(() => {
            const W = 220;
            const H = 36;
            const n = sparkPoints.length;
            const amp = 0.18 + (load / 100) * 0.28;
            return sparkPoints
                .map((p, i) => {
                    const x = (i / (n - 1)) * W;
                    const centered = (p - 0.5) * amp + 0.35;
                    const y = H - centered * H * 0.9 - H * 0.05;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(' ');
        }, [sparkPoints, load]);

        // ── Live tail: FIFO push helper ───────────────────────────
        const pushLogs = (entries: LogEntry[]) => {
            setLogs((prev) => {
                const next = prev.concat(entries);
                return next.length > 30 ? next.slice(next.length - 30) : next;
            });
        };

        // ── Load-driven periodic log generation ───────────────────
        // Cadence shrinks as load rises (faster heartbeat). At idle the
        // stream is mostly INFO with the occasional WARN; under pressure
        // the WARN/ERROR ratio climbs via errorBias.
        useEffect(() => {
            const baseInterval = Math.max(380, 1600 - load * 12);
            const id = window.setInterval(() => {
                const roll = Math.random();
                let level: LogLevel = 'info';
                if (pressure.errorBias > 0 && roll < pressure.errorBias * 0.15) {
                    level = 'error';
                } else if (
                    roll < 0.22 + pressure.errorBias * 0.25 ||
                    pressure.poolActive >= 18
                ) {
                    level = 'warn';
                }
                const entry = pickLog(level, {
                    poolActive: pressure.poolActive,
                    throughput: pressure.throughput,
                    p99: pressure.p99,
                });
                pushLogs([entry]);
            }, baseInterval);
            return () => window.clearInterval(id);
        }, [load, pressure.errorBias, pressure.poolActive, pressure.throughput, pressure.p99]);

        // Seed an initial log so the panel isn't empty on mount.
        useEffect(() => {
            pushLogs([
                mkLog('info', 'boot', 'cockpit attached · listening on 0.0.0.0:8443'),
                mkLog('info', 'config', `region=${region.toLowerCase()} · stack=${currentStack.toLowerCase()}`),
            ]);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [slide.id]);

        const toggleService = (name: string) => {
            setServiceStates((prev) => {
                const wasOk = prev[name] === 'ok';
                const nextState: 'ok' | 'maint' = wasOk ? 'maint' : 'ok';
                // Inject a contextual log line so the Live Tail mirrors
                // the user's manual maintenance toggle.
                if (wasOk) {
                    pushLogs([
                        mkLog('warn', name, 'manual maintenance · draining traffic · circuit half-open'),
                    ]);
                } else {
                    pushLogs([
                        mkLog('info', name, 'maintenance cleared · routing restored'),
                    ]);
                }
                return { ...prev, [name]: nextState };
            });
            setClackKey((prev) => ({ ...prev, [name]: (prev[name] || 0) + 1 }));
        };

        const knockReplica = (idx: number) => {
            setDownReplicas((prev) => {
                if (prev.has(idx)) return prev;
                const next = new Set(prev);
                next.add(idx);
                return next;
            });
            const t = window.setTimeout(() => {
                setDownReplicas((prev) => {
                    const next = new Set(prev);
                    next.delete(idx);
                    return next;
                });
            }, 600);
            restartTimers.current.push(t);
        };

        const [deployPress, fireDeployRipple] = useRipple();
        const [restartPress, fireRestartRipple] = useRipple();
        const [plusPress, firePlusRipple] = useRipple();
        const [minusPress, fireMinusRipple] = useRipple();
        const [crashPress, fireCrashRipple] = useRipple();

        const deploy = (e: React.MouseEvent<HTMLButtonElement>) => {
            fireDeployRipple();
            // Two short pulses — reads as a confident "engage" tick, matches
            // the wire-pulse cascade that fires along the 6 Bézier lines.
            haptic([8, 24, 12]);
            setDeployPulse((n) => n + 1);
            setDeployBurstSeq((n) => n + 1);

            // Inject deploy-flavoured log lines so the Live Tail visibly
            // reacts. Five lines staggered ~110ms — reads as a CI hook.
            const deployLines: { delay: number; entry: LogEntry }[] = [
                { delay: 0, entry: mkLog('info', 'deploy', `building image · sha=${(Math.random() * 0xffffff | 0).toString(16).padStart(6, '0')}`) },
                { delay: 110, entry: mkLog('info', 'deploy', 'image pushed · registry.workeyfy.io') },
                { delay: 230, entry: mkLog('info', 'orchestrator', `rolling out · 0/${replicas} pods ready`) },
                { delay: 360, entry: mkLog('info', 'health', 'liveness probes passing · readiness OK') },
                { delay: 520, entry: mkLog('info', 'deploy', `release green · ${pressure.throughput} req/s steady`) },
            ];
            deployLines.forEach(({ delay, entry }) => {
                const t = window.setTimeout(() => pushLogs([entry]), delay);
                restartTimers.current.push(t);
            });

            // High-impact: a full-viewport shockwave fires from the cursor,
            // and every major panel picks up a cascading wake-glow as the
            // ring sweeps past it (driven via Web Animations API so the
            // cascade retriggers cleanly on every click).
            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            setShockwave({ x, y, key: Date.now() });
            window.setTimeout(() => setShockwave(null), 950);

            const root = rootRef.current;
            if (root) {
                const wakeTargets: [string, number][] = [
                    ['.Cockpit-head', 0],
                    ['.Cockpit-gauges', 120],
                    ['.Cockpit-flowWrap', 220],
                    ['.Cockpit-livetail', 320],
                    ['.Cockpit-control', 420],
                ];
                wakeTargets.forEach(([sel, delay]) => {
                    const el = root.querySelector<HTMLElement>(sel);
                    if (!el) return;
                    el.animate(
                        [
                            { filter: 'brightness(1)', boxShadow: 'none' },
                            {
                                filter: 'brightness(1.5)',
                                boxShadow:
                                    '0 0 0 1px rgba(127,227,255,0.7), 0 0 36px rgba(127,227,255,0.55), inset 0 0 32px rgba(127,227,255,0.2)',
                            },
                            { filter: 'brightness(1)', boxShadow: 'none' },
                        ],
                        { duration: 700, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
                    );
                });
                // Tile-by-tile cascade so each service "wakes up" in turn.
                root.querySelectorAll<HTMLElement>('.Cockpit-tile').forEach((el, i) => {
                    el.animate(
                        [
                            { boxShadow: 'none' },
                            {
                                boxShadow:
                                    '0 0 0 1px rgba(127,227,255,0.7), 0 0 28px rgba(127,227,255,0.55)',
                            },
                            { boxShadow: 'none' },
                        ],
                        { duration: 600, delay: 280 + i * 70, easing: 'ease-out' }
                    );
                });
            }
        };

        // Rolling update: pod-by-pod cycle in-place rather than a full
        // blackout overlay. Each pod walks through 4 phases (drain → term
        // → start → ready) with a synced log line per phase. Stagger
        // between pods is 200ms; per-phase 240ms. Total runtime scales
        // with replica count.
        const restartAll = () => {
            fireRestartRipple();
            // Single thump = "system reboot" cue; the rolling cascade is
            // visual, no overlay blocks input now.
            haptic(22);

            setServiceStates(
                Object.fromEntries(slide.services.map((s) => [s.name, 'ok' as const]))
            );

            const podStagger = 200;
            const phaseMs = 240;
            const totalPods = replicas;

            pushLogs([
                mkLog('info', 'orchestrator', `rolling restart initiated · ${totalPods} pods · maxUnavailable=1`),
            ]);

            Array.from({ length: totalPods }).forEach((_, i) => {
                const base = i * podStagger + 60;
                // drain
                const t1 = window.setTimeout(() => {
                    setRollingPhase((prev) => ({ ...prev, [i]: 'drain' }));
                    pushLogs([mkLog('info', `pod-${i + 1}`, 'draining connections · conntrack 12 → 0')]);
                }, base);
                // terminating
                const t2 = window.setTimeout(() => {
                    setRollingPhase((prev) => ({ ...prev, [i]: 'term' }));
                    pushLogs([mkLog('info', `pod-${i + 1}`, 'terminating · SIGTERM sent · grace 30s')]);
                }, base + phaseMs);
                // starting
                const t3 = window.setTimeout(() => {
                    setRollingPhase((prev) => ({ ...prev, [i]: 'start' }));
                    pushLogs([mkLog('info', `pod-${i + 1}`, 'starting · pulling image · 24MB')]);
                }, base + phaseMs * 2);
                // ready
                const t4 = window.setTimeout(() => {
                    setRollingPhase((prev) => {
                        const next = { ...prev };
                        delete next[i];
                        return next;
                    });
                    pushLogs([mkLog('info', `pod-${i + 1}`, 'ready · health-check OK · serving traffic')]);
                }, base + phaseMs * 3);
                restartTimers.current.push(t1, t2, t3, t4);
            });

            const totalMs = totalPods * podStagger + phaseMs * 3 + 200;
            const tEnd = window.setTimeout(() => {
                pushLogs([
                    mkLog('info', 'orchestrator', `rollout complete · ${totalPods}/${totalPods} pods ready`),
                ]);
            }, totalMs);
            restartTimers.current.push(tEnd);
        };

        const scaleUp = () => {
            firePlusRipple();
            setReplicas((r) => Math.min(REPLICAS_MAX, r + 1));
        };

        const scaleDown = () => {
            fireMinusRipple();
            setReplicas((r) => Math.max(REPLICAS_MIN, r - 1));
        };

        // FORCE ERROR — simulates a pod crash to showcase the cluster's
        // self-healing behaviour. Picks a healthy pod, drops the health
        // score, fires a CRITICAL log line and a burst of failing flow
        // particles, then orchestrator + scheduler + new pod logs walk
        // through the recovery cycle until the LED is green again.
        const forceCrash = () => {
            // Skip if there's no healthy pod left to crash.
            const healthy = Array.from({ length: replicas }, (_, i) => i).filter(
                (i) => !rollingPhase[i] && !downReplicas.has(i)
            );
            if (healthy.length === 0) return;
            fireCrashRipple();
            const podIdx = healthy[(Math.random() * healthy.length) | 0];
            const podLabel = `pod-${podIdx + 1}`;
            // Urgent triple-buzz — distinct from DEPLOY (rising) and
            // RESTART (single thump). Reads as an alert.
            haptic([22, 40, 18]);

            // Phase 1 (t=0)  : the pod goes red, CRITICAL hits the tail.
            setRollingPhase((prev) => ({ ...prev, [podIdx]: 'crash' }));
            setCrashBurstSeq((n) => n + 1);
            pushLogs([
                mkLog('error', podLabel, 'CRITICAL · readiness probe failed · circuit open'),
            ]);

            // Phase 2 (t=320) : orchestrator detects + flags eviction.
            const t1 = window.setTimeout(() => {
                pushLogs([
                    mkLog('warn', 'orchestrator', `unhealthy pod detected · ${podLabel} flagged for eviction`),
                ]);
            }, 320);

            // Phase 3 (t=720) : scheduler evicts + spawns replacement.
            const t2 = window.setTimeout(() => {
                setRollingPhase((prev) => ({ ...prev, [podIdx]: 'term' }));
                pushLogs([
                    mkLog('info', 'scheduler', `evicting ${podLabel} · spawning replacement on node-2`),
                ]);
            }, 720);

            // Phase 4 (t=1180) : new pod cold-starts.
            const t3 = window.setTimeout(() => {
                setRollingPhase((prev) => ({ ...prev, [podIdx]: 'start' }));
                pushLogs([
                    mkLog('info', podLabel, 'cold-start · pulling image · health probes pending'),
                ]);
            }, 1180);

            // Phase 5 (t=1860) : pod ready, service restored.
            const t4 = window.setTimeout(() => {
                setRollingPhase((prev) => {
                    const next = { ...prev };
                    delete next[podIdx];
                    return next;
                });
                pushLogs([
                    mkLog('info', podLabel, 'self-healing complete · ready · cluster back to 100%'),
                ]);
                // Brief confirm tap — "all good now" cue.
                haptic(8);
            }, 1860);

            restartTimers.current.push(t1, t2, t3, t4);
        };

        const rotateStack = () => {
            setStackIdx((i) => (i + 1) % STACK_POOL.length);
            setStackSpin((s) => s + 1);
        };

        // Two-phase tile hover with edge deadzone:
        // 1. enter → mark as candidate, schedule commit after dwell.
        // 2. mousemove → only allow commit when cursor is ≥ EDGE_DEADZONE
        //    pixels away from every edge of the candidate tile.
        // 3. leave → if leaving the candidate, abort the commit; if leaving
        //    the currently committed tile, schedule a clear that yields if
        //    a new candidate emerges in time (handles fast A→gap→B traversal).
        // The result: on the seam between two tiles the cursor never lingers
        // ≥ EDGE_DEADZONE deep into either one, so nothing commits and the
        // currently shown service stays put instead of flickering.
        const HOVER_FIRST_MS = 80;
        const HOVER_SWITCH_MS = 160;
        const HOVER_CLEAR_MS = 200;
        const EDGE_DEADZONE = 6;

        const cancelCommit = () => {
            if (commitTimer.current !== null) {
                window.clearTimeout(commitTimer.current);
                commitTimer.current = null;
            }
        };
        const cancelClear = () => {
            if (clearTimer.current !== null) {
                window.clearTimeout(clearTimer.current);
                clearTimer.current = null;
            }
        };
        const scheduleCommit = (name: string) => {
            cancelCommit();
            const delay = hoveredTileRef.current === null ? HOVER_FIRST_MS : HOVER_SWITCH_MS;
            commitTimer.current = window.setTimeout(() => {
                commitTimer.current = null;
                if (pendingTileRef.current === name && hoveredTileRef.current !== name) {
                    setHoveredTile(name);
                    pendingTileRef.current = null;
                }
            }, delay);
        };

        const onTileEnter = (name: string) => {
            if (touchMode) return;
            cancelClear();
            if (hoveredTileRef.current === name) {
                pendingTileRef.current = null;
                cancelCommit();
                return;
            }
            pendingTileRef.current = name;
            scheduleCommit(name);
        };

        const onTileLeave = (name: string) => {
            if (touchMode) return;
            if (pendingTileRef.current === name) {
                pendingTileRef.current = null;
                cancelCommit();
            }
            if (name === hoveredTileRef.current) {
                cancelClear();
                clearTimer.current = window.setTimeout(() => {
                    clearTimer.current = null;
                    if (pendingTileRef.current === null) {
                        setHoveredTile(null);
                    }
                }, HOVER_CLEAR_MS);
            }
        };

        // Called from the per-tile mousemove. Holds the commit while the
        // cursor is in the EDGE_DEADZONE-wide rim around the candidate, so
        // a finger trembling on the seam between two tiles can't promote
        // either of them.
        const checkTileDeadzone = (
            name: string,
            rect: DOMRect,
            clientX: number,
            clientY: number,
        ) => {
            if (touchMode) return;
            if (pendingTileRef.current !== name) return;
            if (hoveredTileRef.current === name) return;
            const insideInner =
                clientX >= rect.left + EDGE_DEADZONE &&
                clientX <= rect.right - EDGE_DEADZONE &&
                clientY >= rect.top + EDGE_DEADZONE &&
                clientY <= rect.bottom - EDGE_DEADZONE;
            if (!insideInner) {
                cancelCommit();
            } else if (commitTimer.current === null) {
                scheduleCommit(name);
            }
        };

        // On touch devices the first tap is "inspect" (shows the HUD), the
        // second tap on the same tile triggers the maintenance toggle. Mouse
        // users still get a single-click action with the hover popover.
        const onTileClick = (name: string) => {
            if (touchMode) {
                if (hoveredTile === name) {
                    haptic(10);
                    toggleService(name);
                    return;
                }
                const el = tileRefs.current[name];
                haptic(6);
                setAnchorRect(el ? el.getBoundingClientRect() : null);
                setHoveredTile(name);
                return;
            }
            toggleService(name);
        };

        const hoveredHud = hoveredTile
            ? (() => {
                  const idx = slide.services.findIndex((s) => s.name === hoveredTile);
                  if (idx === -1) return null;
                  return { hud: buildHud(h, hoveredTile, idx, stackIdx), name: hoveredTile };
              })()
            : null;

        return (
            <>
                <div
                    ref={setRoots}
                    className={`Cockpit${mobileDrawerOpen ? ' Cockpit--mobile-drawer-open' : ''}${hoveredTile ? ' Cockpit--scanning' : ''}`}
                    data-deploy-pulse={deployPulse}
                >
                    <div ref={tiltWrapRef} className="Cockpit-tilt">
                        <header className="Cockpit-head">
                            <h2 className="Cockpit-title">{slide.title}</h2>
                            <a
                                href={`https://${slide.domain}`}
                                target="_blank"
                                rel="noreferrer"
                                className="Cockpit-link"
                            >
                                {slide.domain}
                                <ExternalLinkIcon />
                            </a>
                        </header>

                        <div ref={bodyRef} className="Cockpit-body">
                            <section className="Cockpit-gauges" aria-label="Observability gauges">
                                <header className="Cockpit-panelHead">
                                    <span className="Cockpit-panelDot" />
                                    OBSERVABILITY · SRE
                                </header>

                                <div className="Cockpit-row Cockpit-row--spark">
                                    <span className="Cockpit-rowKey">LATENCY</span>
                                    <svg
                                        className="Cockpit-spark"
                                        viewBox="0 0 220 36"
                                        preserveAspectRatio="none"
                                        aria-hidden="true"
                                    >
                                        <polyline
                                            points={sparkPolylineP50}
                                            fill="none"
                                            stroke="rgba(127, 227, 255, 0.55)"
                                            strokeWidth="1.2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeDasharray="2 3"
                                        />
                                        <polyline
                                            points={sparkPolylineP99}
                                            fill="none"
                                            stroke={pressure.p99 > 300 ? '#ff9f1c' : '#4ADE80'}
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <polyline
                                            points={sparkPolylineP99}
                                            fill="none"
                                            stroke={pressure.p99 > 300 ? 'rgba(255,159,28,0.35)' : 'rgba(74, 222, 128, 0.35)'}
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ filter: 'blur(3px)' }}
                                        />
                                    </svg>
                                    <span className="Cockpit-rowVal Cockpit-rowVal--stack">
                                        <span className="Cockpit-rowVal-sub">p50 {pressure.p50}ms</span>
                                        <span className={`Cockpit-rowVal-main${pressure.p99 > 300 ? ' Cockpit-rowVal-main--warn' : ''}`}>
                                            p99 {liveLatency}ms
                                        </span>
                                    </span>
                                </div>

                                <div className="Cockpit-row">
                                    <span className="Cockpit-rowKey">THROUGHPUT</span>
                                    <div className="Cockpit-throughput">
                                        <span className="Cockpit-throughput-bar" style={{ width: `${Math.min(100, (pressure.throughput / 5000) * 100)}%` }} />
                                    </div>
                                    <span className="Cockpit-rowVal">
                                        {pressure.throughput >= 1000
                                            ? `${(pressure.throughput / 1000).toFixed(1)}k`
                                            : pressure.throughput}
                                        <span className="Cockpit-rowVal-unit">req/s</span>
                                    </span>
                                </div>

                                <div className="Cockpit-row">
                                    <span className="Cockpit-rowKey">HEAP</span>
                                    <HeapMeter pct={pressure.heapPct} gcInterval={pressure.gcInterval} />
                                </div>

                                <div className="Cockpit-row">
                                    <span className="Cockpit-rowKey">DB POOL</span>
                                    <DbPoolWidget active={pressure.poolActive} waiting={pressure.poolWaiting} />
                                </div>

                                <div className="Cockpit-row">
                                    <span className="Cockpit-rowKey">REPLICAS</span>
                                    <div
                                        className="Cockpit-leds"
                                        role="group"
                                        aria-label="Cluster replicas"
                                    >
                                        {Array.from({ length: replicas }).map((_, i) => {
                                            const phase = rollingPhase[i];
                                            const down = downReplicas.has(i);
                                            const cls =
                                                phase === 'crash' ? ' Cockpit-led--crash'
                                                : phase === 'drain' ? ' Cockpit-led--drain'
                                                : phase === 'term' ? ' Cockpit-led--term'
                                                : phase === 'start' ? ' Cockpit-led--start'
                                                : down ? ' Cockpit-led--down'
                                                : '';
                                            const label = phase
                                                ? `Replica ${i + 1} ${phase}`
                                                : down
                                                    ? `Replica ${i + 1} restarting`
                                                    : `Replica ${i + 1} healthy`;
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className={`Cockpit-led${cls}`}
                                                    onClick={() => knockReplica(i)}
                                                    aria-label={label}
                                                />
                                            );
                                        })}
                                    </div>
                                    <span className="Cockpit-rowVal">
                                        {replicas - downReplicas.size - Object.keys(rollingPhase).length}/{replicas}
                                    </span>
                                </div>

                                <div className="Cockpit-gauges-footer">
                                    {(() => {
                                        const ready = replicas - downReplicas.size - Object.keys(rollingPhase).length;
                                        const healthPct = Math.max(0, Math.round((ready / replicas) * 100));
                                        const hasCrash = Object.values(rollingPhase).includes('crash');
                                        const degraded = healthPct < 100;
                                        const mod = hasCrash
                                            ? ' Cockpit-chip--health-crash'
                                            : degraded
                                                ? ' Cockpit-chip--health-degraded'
                                                : '';
                                        return (
                                            <span className={`Cockpit-chip Cockpit-chip--health${mod}`}>
                                                <span className="Cockpit-chip-key">HEALTH</span>
                                                <span className="Cockpit-chip-val">
                                                    {healthPct}%
                                                </span>
                                                <span className="Cockpit-chip-tag">
                                                    {hasCrash
                                                        ? 'INCIDENT'
                                                        : degraded
                                                            ? 'HEALING'
                                                            : 'NOMINAL'}
                                                </span>
                                            </span>
                                        );
                                    })()}
                                    <button
                                        type="button"
                                        className="Cockpit-chip Cockpit-chip--stack"
                                        onClick={rotateStack}
                                        aria-label="Cycle stack"
                                        style={
                                            {
                                                '--spin': `${stackSpin * 360}deg`,
                                            } as React.CSSProperties
                                        }
                                    >
                                        <span className="Cockpit-chip-key">STACK</span>
                                        <span className="Cockpit-chip-val">{currentStack}</span>
                                        <span className="Cockpit-chip-spin">
                                            <RefreshIcon />
                                        </span>
                                    </button>
                                    <span className="Cockpit-chip Cockpit-chip--region">
                                        <span className="Cockpit-regionPing" />
                                        <span className="Cockpit-chip-val">{region}</span>
                                    </span>
                                </div>
                            </section>

                            <section className="Cockpit-flowWrap" aria-label="Request flow and services">
                                <header className="Cockpit-panelHead">
                                    <span className="Cockpit-panelDot" />
                                    REQUEST LIFECYCLE
                                    <span className="Cockpit-panelHint">
                                        click a node for stack details · particles scale with LOAD
                                    </span>
                                    <button
                                        type="button"
                                        className="Cockpit-mobileDrawerClose"
                                        onClick={closeMobileDrawer}
                                        aria-label="Fermer les détails techniques"
                                    >
                                        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                                            <path d="M3 3 13 13 M13 3 3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                </header>

                                <FlowDiagram
                                    pressure={pressure}
                                    onNodeClick={(stage) =>
                                        setFlowFocus((prev) => (prev?.id === stage.id ? null : stage))
                                    }
                                    activeService={hoveredTile ?? slide.services[0]?.name ?? null}
                                    deployBurst={deployBurstSeq}
                                    crashBurst={crashBurstSeq}
                                />

                                {flowFocus && (
                                    <div className="Cockpit-flow-detail" role="dialog">
                                        <button
                                            type="button"
                                            className="Cockpit-flow-detail-close"
                                            onClick={() => setFlowFocus(null)}
                                            aria-label="Close detail"
                                        >×</button>
                                        <span className="Cockpit-flow-detail-key">{flowFocus.label}</span>
                                        <span className="Cockpit-flow-detail-stack">{flowFocus.stack}</span>
                                        <span className="Cockpit-flow-detail-msg">{flowFocus.detail}</span>
                                    </div>
                                )}

                                <div className="Cockpit-servicesStripHead">
                                    <span>SERVICES</span>
                                    <span className="Cockpit-servicesStripHint">tap to toggle maintenance · hover for SRE drill-down</span>
                                </div>
                                <div className="Cockpit-servicesGrid">
                                    {slide.services.map((s, i) => {
                                        const state = serviceStates[s.name] || 'ok';
                                        const accent = i % 2 === 0 ? 'blue' : 'green';
                                        const isFocused = !touchMode && hoveredTile === s.name;
                                        // Per-tile HUD so the editorial-list variant in
                                        // Atelier can surface runtime/version/replicas/p99
                                        // inline via CSS attr(). The original Cockpit tile
                                        // visual ignores these data attrs entirely.
                                        const tileHud = buildHud(h, s.name, i, stackIdx);
                                        // Compact runtime label (drop "/ JVM 21" → "JVM 21").
                                        const runtimeShort = tileHud.runtime.split(' / ').pop() || tileHud.runtime;
                                        const onTileMove = (
                                            ev: React.MouseEvent<HTMLButtonElement>
                                        ) => {
                                            if (touchMode) return;
                                            const el = ev.currentTarget;
                                            const r = el.getBoundingClientRect();
                                            const nx = (ev.clientX - r.left - r.width / 2) / (r.width / 2);
                                            const ny = (ev.clientY - r.top - r.height / 2) / (r.height / 2);
                                            el.style.setProperty('--tile-ry', `${(nx * 8).toFixed(2)}deg`);
                                            el.style.setProperty('--tile-rx', `${(-ny * 8).toFixed(2)}deg`);
                                            checkTileDeadzone(s.name, r, ev.clientX, ev.clientY);
                                        };
                                        const onTileMoveLeave = (
                                            ev: React.MouseEvent<HTMLButtonElement>
                                        ) => {
                                            ev.currentTarget.style.removeProperty('--tile-rx');
                                            ev.currentTarget.style.removeProperty('--tile-ry');
                                            onTileLeave(s.name);
                                        };
                                        return (
                                            <button
                                                type="button"
                                                key={s.name}
                                                ref={(el) => {
                                                    tileRefs.current[s.name] = el;
                                                }}
                                                className={`Cockpit-tile Cockpit-tile--${accent} Cockpit-tile--${state}${
                                                    touchMode && hoveredTile === s.name
                                                        ? ' Cockpit-tile--inspecting'
                                                        : ''
                                                }${isFocused ? ' Cockpit-tile--focus' : ''}`}
                                                onClick={() => onTileClick(s.name)}
                                                onMouseEnter={() => onTileEnter(s.name)}
                                                onMouseMove={onTileMove}
                                                onMouseLeave={onTileMoveLeave}
                                                onFocus={() => !touchMode && setHoveredTile(s.name)}
                                                onBlur={() => !touchMode && setHoveredTile(null)}
                                                data-magnetic=""
                                                data-clack={clackKey[s.name] || 0}
                                                data-svc-runtime={runtimeShort}
                                                data-svc-version={tileHud.version}
                                                data-svc-replicas={tileHud.replicas}
                                                data-svc-p99={tileHud.latencyMs}
                                                data-svc-state={state}
                                                aria-expanded={touchMode ? hoveredTile === s.name : undefined}
                                                style={
                                                    {
                                                        '--cascade-delay': `${i * 60}ms`,
                                                    } as React.CSSProperties
                                                }
                                                aria-pressed={state === 'maint'}
                                            >
                                                <span className="Cockpit-tileTop">
                                                    <span className="Cockpit-tileLed" />
                                                    <span className="Cockpit-tileState">
                                                        {state === 'ok' ? s.status : 'Maintenance'}
                                                    </span>
                                                </span>
                                                <span className="Cockpit-tileName">{s.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Live tail is rendered inside Cockpit-body so the
                                Atelier override CSS can place it as a 3rd column
                                next to gauges/flow. In the default (non-Atelier)
                                mode it wraps below as a full-width row via
                                `grid-column: 1 / -1`. */}
                            <LiveTail logs={logs} />
                        </div>

                        <div className="Cockpit-control" aria-label="Control deck">
                            <label className="Cockpit-loadCtl">
                                <span className="Cockpit-loadKey">LOAD</span>
                                <input
                                    className="Cockpit-loadRange"
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={load}
                                    onChange={(e) => setLoad(Number(e.target.value))}
                                    style={
                                        { '--load-pct': `${load}%` } as React.CSSProperties
                                    }
                                    aria-label="Simulated load"
                                />
                                <span className="Cockpit-loadVal">{load}%</span>
                            </label>

                            <div className="Cockpit-actions">
                                <button
                                    type="button"
                                    className="Cockpit-btn Cockpit-btn--primary"
                                    onClick={deploy}
                                    data-magnetic=""
                                    data-press={deployPress.trigger}
                                >
                                    <span
                                        className="Cockpit-btnRipple"
                                        key={deployPress.ripples}
                                    />
                                    DEPLOY
                                </button>
                                <button
                                    type="button"
                                    className="Cockpit-btn"
                                    onClick={restartAll}
                                    data-magnetic=""
                                    data-press={restartPress.trigger}
                                >
                                    <span
                                        className="Cockpit-btnRipple"
                                        key={restartPress.ripples}
                                    />
                                    RESTART
                                </button>
                                <button
                                    type="button"
                                    className="Cockpit-btn Cockpit-btn--small"
                                    onClick={scaleUp}
                                    data-press={plusPress.trigger}
                                    aria-label="Scale up replicas"
                                >
                                    <span
                                        className="Cockpit-btnRipple"
                                        key={plusPress.ripples}
                                    />
                                    SCALE +
                                </button>
                                <button
                                    type="button"
                                    className="Cockpit-btn Cockpit-btn--small"
                                    onClick={scaleDown}
                                    data-press={minusPress.trigger}
                                    aria-label="Scale down replicas"
                                >
                                    <span
                                        className="Cockpit-btnRipple"
                                        key={minusPress.ripples}
                                    />
                                    SCALE −
                                </button>
                                <button
                                    type="button"
                                    className="Cockpit-btn Cockpit-btn--danger Cockpit-btn--small"
                                    onClick={forceCrash}
                                    data-press={crashPress.trigger}
                                    aria-label="Force a pod crash to demo self-healing"
                                    title="Simulate a pod crash · cluster self-heals"
                                >
                                    <span
                                        className="Cockpit-btnRipple"
                                        key={crashPress.ripples}
                                    />
                                    <span className="Cockpit-btn-dot" aria-hidden="true" />
                                    FORCE ERROR
                                </button>
                            </div>
                        </div>

                        {/* Mobile-only trigger — CSS keeps it hidden above
                            768px so the desktop control deck is untouched.
                            Rendered inside Cockpit-tilt so it inherits the
                            cockpit's visual layer order. */}
                        <button
                            type="button"
                            className="Cockpit-mobileDrawerTrigger"
                            onClick={openMobileDrawer}
                            aria-expanded={mobileDrawerOpen}
                        >
                            <span className="Cockpit-mobileDrawerTrigger-dot" aria-hidden="true" />
                            DÉTAILS TECHNIQUES
                            <span className="Cockpit-mobileDrawerTrigger-chev" aria-hidden="true">
                                <svg viewBox="0 0 12 12" width="10" height="10">
                                    <path d="M3 4l3 4 3-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        </button>

                        {/* Mobile drawer backdrop — pointer-events flip on
                            .Cockpit--mobile-drawer-open. Visually transparent
                            on desktop (CSS keeps it inert). */}
                        <div
                            className="Cockpit-mobileDrawerBackdrop"
                            onClick={closeMobileDrawer}
                            aria-hidden="true"
                        />

                        {/* Edge data-streams — pure decorative noise that
                            sells the "machine breathing" aesthetic. The two
                            tracks are duplicated inline so the keyframe can
                            loop seamlessly with translateY(-50%). */}
                        <EdgeStream side="left" seed={h} />
                        <EdgeStream side="right" seed={h ^ 0x9e3779b9} />
                    </div>
                </div>

                {/* DEPLOY shockwave: ring expansion + radial flash from the
                    button's centre, anchored via CSS vars on inline style. */}
                {shockwave &&
                    createPortal(
                        <div
                            key={shockwave.key}
                            className="Cockpit-shockwave"
                            style={
                                {
                                    '--shock-x': `${shockwave.x}px`,
                                    '--shock-y': `${shockwave.y}px`,
                                } as React.CSSProperties
                            }
                            aria-hidden="true"
                        >
                            <span className="Cockpit-shockwave-flash" />
                            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                                <circle
                                    className="Cockpit-shockwave-ring"
                                    cx={(shockwave.x / window.innerWidth) * 100}
                                    cy={(shockwave.y / window.innerHeight) * 100}
                                    r="3"
                                />
                                <circle
                                    className="Cockpit-shockwave-ring Cockpit-shockwave-ring--outer"
                                    cx={(shockwave.x / window.innerWidth) * 100}
                                    cy={(shockwave.y / window.innerHeight) * 100}
                                    r="3"
                                />
                            </svg>
                        </div>,
                        document.body
                    )}

                {hoveredHud &&
                    createPortal(
                        <div
                            ref={popoverRef}
                            className={`Cockpit-tileHud-portal${
                                touchMode ? ' Cockpit-tileHud-portal--touch' : ''
                            }`}
                            style={{ position: 'fixed' }}
                        >
                            <HudCard
                                hud={hoveredHud.hud}
                                serviceName={hoveredHud.name}
                                seed={h ^ hashId(hoveredHud.name)}
                            />
                        </div>,
                        document.body
                    )}
            </>
        );
    }
);

export default BackendCockpit;
