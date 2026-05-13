import { useEffect, useMemo, useRef, useState } from 'react';
import './RuptureBackend.css';

const TECH_WORDS = [
    'POSTGRES', 'REDIS', 'NATS', 'KAFKA', 'K8S', 'GRAPHQL',
    'RUST', 'GO', 'TOKIO', 'DENO', 'EDGE', 'JWT',
    'mTLS', 'gRPC', 'PROMETHEUS', 'GRAFANA', 'TRACE', 'REPLICA',
    'SHARD', 'INDEX', 'MIGRATION', 'WAL', 'FSYNC', 'QUORUM',
];

const CODE_SNIPPETS: Record<string, string> = {
    POSTGRES: `// streaming WAL → standby
SELECT pg_create_physical_replication_slot('replica_7');
ALTER SYSTEM SET wal_level = 'logical';`,
    REDIS: `// edge cache, signed
const v = await redis.get(\`u:\${id}:\${rev}\`);
if (!v) { await refresh(id); }
return JSON.parse(v);`,
    NATS: `// at-most-once delivery
await js.publish('orders.created', payload, {
    msgID: order.id,
    expect: { lastSubjectSequence: 0 },
});`,
    KAFKA: `// idempotent producer
const producer = kafka.producer({
    idempotent: true,
    maxInFlightRequests: 5,
});
await producer.send({ topic, messages });`,
    K8S: `# deployment, rolling
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 25%`,
    GRAPHQL: `// persisted query
query { user(id: $id) {
  name, plan, sessions(last: 3) {
    createdAt, region
  }
} }`,
    RUST: `// tokio task, bounded
let h = tokio::spawn(async move {
    while let Some(msg) = rx.recv().await {
        process(msg).await?;
    }
});`,
    GO: `// graceful shutdown
ctx, cancel := signal.NotifyContext(
    context.Background(),
    os.Interrupt, syscall.SIGTERM,
)
defer cancel()`,
    TOKIO: `// cooperative scheduling
tokio::select! {
    _ = shutdown.recv() => return,
    msg = stream.next() => handle(msg).await,
}`,
    DENO: `// permissions-first
deno run --allow-net=api.local
        --allow-env=DB_URL
        server.ts`,
    EDGE: `// nearest-replica routing
const r = req.cf.colo;
const node = pickReplica(r, regions);
return fetch(node.url, req);`,
    JWT: `// short-lived, rotated
const t = await sign(payload, key, {
    algorithm: 'RS256',
    expiresIn: '15m',
});`,
    mTLS: `# istio peer auth
spec:
  mtls:
    mode: STRICT
  selector:
    matchLabels:
      tier: core`,
    gRPC: `// streaming bidi
rpc Watch(stream Cursor)
    returns (stream Event) {}`,
    PROMETHEUS: `# slo alert
- alert: ApiP99
  expr: histogram_quantile(0.99,
    rate(http_req_seconds_bucket[5m]))
    > 0.250`,
    GRAFANA: `// dashboards as code
import { Dashboard } from '@grafana/sdk';
new Dashboard({ uid: 'core-rps' })
    .panel(Panel.timeseries(...));`,
    TRACE: `// OpenTelemetry
const span = tracer.startSpan('checkout');
span.setAttribute('user.tier', 'pro');
span.end();`,
    REPLICA: `-- promote standby
SELECT pg_promote(true, 60);
-- WAL stream resumes on new primary`,
    SHARD: `// consistent hashing
const ring = new HashRing(nodes);
const shard = ring.get(\`user:\${id}\`);`,
    INDEX: `-- partial, on hot rows
CREATE INDEX CONCURRENTLY
ON orders(created_at)
WHERE status = 'pending';`,
    MIGRATION: `-- zero-downtime
ALTER TABLE users
ADD COLUMN plan_v2 text
DEFAULT NULL;
-- backfill in batches, then NOT NULL`,
    WAL: `// write-ahead log
fsync(wal_fd);   // every commit
flush_buffer();  // every 10ms
checkpoint();    // every 5min`,
    FSYNC: `// durable by default
const fd = await fs.open(path, 'w');
await fd.writeFile(buf);
await fd.sync();  // hit the platter`,
    QUORUM: `// raft consensus
if (votes >= (peers.length / 2) + 1) {
    becomeLeader(term);
}`,
};

const ASCII_FRAMES = [
    // Frame 1 — steady state
    String.raw`
                    [  load balancer  ]
                   /         |         \
              [api-a]     [api-b]     [api-c]
                 \\          |          /
                   \\        |        /
                  [   redis cluster   ]
                          |
              [        postgres lead         ]
                  /        |        \
            [replica1] [replica2] [replica3]
`,
    // Frame 2 — scaling
    String.raw`
                    [  load balancer  ]
                  / |    |    |    |  \
            [api-a][api-b][api-c][api-d][api-e]
                 \\\\         |          //
                   \\\\       |        //
                  [   redis cluster   ]
                          |
              [        postgres lead         ]
                  /        |        \
            [replica1] [replica2] [replica3]
`,
    // Frame 3 — failover
    String.raw`
                    [  load balancer  ]
                   /         |         \
              [api-a]     [api-b]     [api-c]
                 \\          |          /
                   \\        |        /
                  [   redis cluster   ]
                          |
              [        postgres  ✗         ]
                  /        |        \
            [replica1] [replica2*] [replica3]
                            \\
                       (promoted leader)
`,
    // Frame 4 — deploy
    String.raw`
                    [  load balancer  ]
                   /         |         \
              [api-a]     [api-b]     [api-c]
                 \\          |          /
              v2.4.1     v2.4.1     v2.4.0 ⟳
                  [   redis cluster   ]
                          |
              [        postgres lead         ]
                  /        |        \
            [replica1] [replica2] [replica3]
`,
    // Frame 5 — quiet
    String.raw`
                    [  load balancer  ]
                   /         |         \
              [api-a]     [api-b]     [api-c]
                 \\          |          /
                   \\        |        /
                  [   redis cluster   ]
                          |
              [        postgres lead         ]
                  /        |        \
            [replica1] [replica2] [replica3]

         · idle · idle · idle · idle ·
`,
];

const FRAME_LABELS = ['steady', 'scaling', 'failover', 'deploy', 'quiet'];

type Particle = {
    word: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rot: number;
    rotV: number;
};

export default function RuptureBackend() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const mouseRef = useRef({ x: -9999, y: -9999, active: false });
    const [frame, setFrame] = useState(0);
    const [openSnippet, setOpenSnippet] = useState<string | null>(null);

    useEffect(() => {
        const id = window.setInterval(() => {
            setFrame((f) => (f + 1) % ASCII_FRAMES.length);
        }, 4200);
        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        const wrap = wrapperRef.current;
        const cvs = canvasRef.current;
        if (!wrap || !cvs) return;
        const ctx = cvs.getContext('2d');
        if (!ctx) return;

        const palette = ['#0A0A0A', '#0CB370', '#FF1B8D', '#0A0A0A', '#0CB370'];
        const sizing = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const r = wrap.getBoundingClientRect();
            cvs.width = r.width * dpr;
            cvs.height = r.height * dpr;
            cvs.style.width = `${r.width}px`;
            cvs.style.height = `${r.height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        sizing();
        const r0 = wrap.getBoundingClientRect();

        particlesRef.current = TECH_WORDS.map((w, i) => ({
            word: w,
            x: Math.random() * r0.width,
            y: Math.random() * r0.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            color: palette[i % palette.length],
            size: 13 + Math.random() * 10,
            rot: (Math.random() - 0.5) * 0.5,
            rotV: (Math.random() - 0.5) * 0.005,
        }));

        let raf = 0;
        const tick = () => {
            const rect = wrap.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);

            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;
            const active = mouseRef.current.active;

            for (const p of particlesRef.current) {
                if (active) {
                    const dx = mx - p.x;
                    const dy = my - p.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < 350 * 350 && d2 > 100) {
                        const f = 60 / d2;
                        p.vx += dx * f;
                        p.vy += dy * f;
                    } else if (d2 <= 100) {
                        p.vx -= dx * 0.002;
                        p.vy -= dy * 0.002;
                    }
                }
                p.vx *= 0.96;
                p.vy *= 0.96;
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.rotV;

                if (p.x < 0) { p.x = 0; p.vx *= -0.6; }
                if (p.x > rect.width) { p.x = rect.width; p.vx *= -0.6; }
                if (p.y < 0) { p.y = 0; p.vy *= -0.6; }
                if (p.y > rect.height) { p.y = rect.height; p.vy *= -0.6; }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.font = `700 ${p.size}px 'JetBrains Mono', ui-monospace, monospace`;
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                ctx.fillText(p.word, 0, 0);
                ctx.restore();
            }

            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        const onMove = (e: MouseEvent) => {
            const r = wrap.getBoundingClientRect();
            mouseRef.current.x = e.clientX - r.left;
            mouseRef.current.y = e.clientY - r.top;
            mouseRef.current.active = true;
        };
        const onLeave = () => {
            mouseRef.current.active = false;
        };
        const onClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('.RuptureBackend-snippet')) return;
            const r = wrap.getBoundingClientRect();
            const cx = e.clientX - r.left;
            const cy = e.clientY - r.top;
            let nearest: Particle | null = null;
            let best = 28 * 28;
            for (const p of particlesRef.current) {
                const dx = p.x - cx;
                const dy = p.y - cy;
                const d2 = dx * dx + dy * dy;
                if (d2 < best) {
                    best = d2;
                    nearest = p;
                }
            }
            if (nearest && CODE_SNIPPETS[nearest.word]) {
                setOpenSnippet(nearest.word);
            }
        };
        const onResize = () => sizing();

        wrap.addEventListener('mousemove', onMove);
        wrap.addEventListener('mouseleave', onLeave);
        wrap.addEventListener('click', onClick);
        window.addEventListener('resize', onResize);
        return () => {
            cancelAnimationFrame(raf);
            wrap.removeEventListener('mousemove', onMove);
            wrap.removeEventListener('mouseleave', onLeave);
            wrap.removeEventListener('click', onClick);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    const manifesto = useMemo(
        () => [
            "We don't build APIs. We build contracts.",
            'Postgres is for adults.',
            'At 03:17 UTC something failed. Nobody noticed.',
            'The backend is the promise.',
        ],
        []
    );

    return (
        <div ref={wrapperRef} className="RuptureBackend">
            <canvas ref={canvasRef} className="RuptureBackend-particles" aria-hidden />
            <div className="RuptureBackend-paper" />

            <header className="RuptureBackend-head">
                <span className="RuptureBackend-tag">// BACKEND_PROTOTYPE / G / RUPTURE</span>
                <span className="RuptureBackend-meta">v.0001 · cluster · alive</span>
            </header>

            <h2 className="RuptureBackend-title" aria-label="Backend is not a poem.">
                <span className="RuptureBackend-title-l1">BACKEND</span>
                <span className="RuptureBackend-title-l2">IS&nbsp;NOT</span>
                <span className="RuptureBackend-title-l3">A&nbsp;POEM.</span>
            </h2>

            <aside className="RuptureBackend-note RuptureBackend-note--a">
                // 03:17 UTC — replica-7 elected leader<br />
                // {`{`} term: 42, votes: 5/7 {`}`}
            </aside>
            <aside className="RuptureBackend-note RuptureBackend-note--b">
                // 99.997% — rolling 30d uptime<br />
                // p50 = 47ms · p99 = 142ms
            </aside>
            <aside className="RuptureBackend-note RuptureBackend-note--c">
                // kafka.consume({`{`} groupId: 'core' {`}`})<br />
                // ackMode: 'manual' — backpressure ok
            </aside>

            <figure className="RuptureBackend-ascii">
                <pre className="RuptureBackend-ascii-pre" key={frame}>
                    {ASCII_FRAMES[frame]}
                </pre>
                <figcaption className="RuptureBackend-ascii-caption">
                    <span className="RuptureBackend-ascii-state">{FRAME_LABELS[frame]}</span>
                    <span className="RuptureBackend-ascii-frame">
                        frame {String(frame + 1).padStart(2, '0')} / {ASCII_FRAMES.length}
                    </span>
                </figcaption>
            </figure>

            <ul className="RuptureBackend-manifesto" aria-label="manifesto">
                {manifesto.map((m, i) => (
                    <li key={m} className="RuptureBackend-manifesto-item" data-i={i}>
                        <span className="RuptureBackend-manifesto-bullet">{`§ ${String(i + 1).padStart(2, '0')}`}</span>
                        <span className="RuptureBackend-manifesto-text">{m}</span>
                    </li>
                ))}
            </ul>

            <div className="RuptureBackend-hint">
                <span>↘</span>
                <span>tap a flying word for the actual code</span>
            </div>

            {openSnippet && CODE_SNIPPETS[openSnippet] && (
                <div className="RuptureBackend-snippet" role="dialog" aria-label={`Code for ${openSnippet}`}>
                    <header className="RuptureBackend-snippet-head">
                        <span className="RuptureBackend-snippet-tag">// {openSnippet}</span>
                        <button
                            type="button"
                            className="RuptureBackend-snippet-close"
                            onClick={() => setOpenSnippet(null)}
                            aria-label="Close"
                        >
                            ×
                        </button>
                    </header>
                    <pre className="RuptureBackend-snippet-pre">{CODE_SNIPPETS[openSnippet]}</pre>
                </div>
            )}
        </div>
    );
}
