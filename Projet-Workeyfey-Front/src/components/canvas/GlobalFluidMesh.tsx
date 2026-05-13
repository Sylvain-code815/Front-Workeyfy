import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

// Liquid Silver defaults — both colours are very low-chroma so the
// shader's achromatic detection kicks in automatically (deeper base +
// boosted refraction). Projects without a curated palette inherit this
// premium chrome ambiance rather than a brand-specific accent.
const DEFAULT_COLOR_LEFT = '#A8AEB8';   // Cool steel
const DEFAULT_COLOR_RIGHT = '#1E2227';  // Deep cool anthracite
const DEFAULT_SPEED = 0.06;             // Baseline — matches the original hardcoded time scalar.
const DEFAULT_SATURATION = 0.5;         // 1 = full palette saturation, 0 = fully grey.
const DEFAULT_INTENSITY = 0.7;          // 1 = previous brightness, <1 dials the mesh toward ambient.
const TWEEN_DURATION_S = 1.5;           // Long, deliberate color crossfade — reads as a clean color shift, not a snap.
const TWEEN_EASE = 'power1.inOut';      // Symmetric, gentle ease — no perceptual "kick".

type FluidMeshProps = {
    className?: string;
    /** Accepted for backward-compat with call sites; no longer modulates the
     *  mesh. The fluid stays at a fixed mid-energy look across all sections
     *  so fast scrolling never produces a brightness/refraction shift. */
    progress: number;
    /** Left-side fluid color. Tweened toward target with GSAP power1.inOut 1.5s. */
    colorLeft?: string;
    /** Right-side fluid color. Tweened toward target with GSAP power1.inOut 1.5s. */
    colorRight?: string;
    /** Accepted for backward-compat with call sites; the noise flow is now
     *  pinned to DEFAULT_SPEED so cadence stays continuous across slide
     *  changes — only colors shift on swap, never the apparent motion. */
    speed?: number;
    /** How much of the palette's chroma to preserve. 1 = full saturation,
     *  0 = fully grey. Default 0.5 — the mesh is ambiance, not projector. */
    saturation?: number;
    /** Overall brightness multiplier for the colour contribution layer
     *  (base + refraction are unaffected). 0.7 keeps the mesh below the
     *  central content in visual hierarchy. */
    intensity?: number;
};

/* ----------------------------------------------------------------------
 * "Cyber-Sober" liquid flow — chameleon edition.
 *
 *  - Liquid Silver by default: low-chroma steel + anthracite palette
 *    automatically triggers the achromatic branch (deeper base + boosted
 *    refraction), so any project without a curated palette reads as a
 *    premium chrome ambiance rather than a branded accent.
 *  - When a project DOES carry a palette, the shader desaturates it to
 *    `uSaturation` (default 0.5) so the mesh tints the scene without
 *    competing with the central content. "Ambiance, pas projecteur."
 *  - `uIntensity` dims the colour contribution layer further (default
 *    0.7) — the base and refraction stay; only the chromatic blooms
 *    soften. This puts the mesh below text/content in visual weight.
 *  - Composition is symmetric: no per-side bias. The legacy "right-side
 *    flood" (originally the FiveM toxic-green dominance for Section 3)
 *    was removed — per-project palettes own their identity directly.
 *  - Multi-octave low-freq simplex drives a controlled ferrofluid-like
 *    silhouette. Flow rate is pinned to DEFAULT_SPEED — noise cadence
 *    stays perfectly continuous across slide and scroll events, so the
 *    eye never reads "the mesh moved" when only colors changed.
 *  - Achromatic detection (Liquid Silver mode): when max chroma of the
 *    perceived palette is below ~0.05–0.15, base → #050505 and refraction
 *    × 1.8 for that "silver liquid" depth on B&W projects.
 *  - Colors are GSAP-tweened (power1.inOut 1.5s) on slide changes —
 *    long enough to read as a deliberate color shift rather than a snap.
 *  - `progress` and per-slide `speed` props are accepted for backward
 *    compatibility but no longer affect the visuals: scroll-driven energy
 *    modulation and per-slide speed tweening were removed because they
 *    made colour appearance shift with scroll velocity / slide cadence,
 *    which the eye misread as "the mesh repositioned itself" instead of
 *    "the colour changed". The mesh now sits at a constant mid-energy
 *    look and a constant flow speed; only colours animate.
 * ---------------------------------------------------------------------- */

const VERTEX_SHADER = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`;

const FRAGMENT_SHADER = /* glsl */ `
    precision highp float;

    varying vec2 vUv;

    uniform float uTime;
    uniform float uSpeed;
    uniform float uSaturation;   // 1 = original, 0 = fully grey.
    uniform float uIntensity;    // Multiplier on the colour contribution layer.
    uniform vec2  uAspect;
    uniform vec3  uBase;
    uniform vec3  uBaseAchromatic;
    uniform vec3  uColorLeft;
    uniform vec3  uColorRight;
    uniform vec3  uRefraction;

    /* Simplex 2D — Ashima */
    vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                       + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                                dot(x12.zw, x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }

    /* Multi-octave noise — controlled, low freq, ferrofluid-like silhouette. */
    float liquid(vec2 uv, float t) {
        /* Aspect-correct UV so blobs don't smear horizontally on widescreens. */
        vec2 p = uv * vec2(uAspect.x / uAspect.y, 1.0);
        float n  = 0.55 * snoise(p * 1.3 + vec2( t * 0.6,  t * 0.4));
        n       += 0.30 * snoise(p * 2.4 + vec2(-t * 0.4,  t * 0.7));
        n       += 0.15 * snoise(p * 4.7 + vec2( t * 0.2, -t * 0.5));
        return n;
    }

    /* HSL-style chroma: max(R,G,B) - min(R,G,B). Zero for pure greyscale,
       up to 1.0 for fully saturated colours. We use the maximum chroma
       across both streams to decide if the palette is "achromatic" (B&W
       theme) and needs the deeper base + boosted refraction. */
    float chroma(vec3 c) {
        return max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
    }

    /* Mix the colour toward its luminance to lower perceived saturation.
       amount = 1 keeps the original, amount = 0 collapses to grey. Rec.601
       luma weights (0.299/0.587/0.114) match the human eye's sensitivity. */
    vec3 desaturate(vec3 c, float amount) {
        float lum = dot(c, vec3(0.299, 0.587, 0.114));
        return mix(vec3(lum), c, amount);
    }

    void main() {
        vec2 uv = vUv;

        /* uSpeed is the per-project absolute flow rate: 0.02 = calm, 0.06
           = default, 0.08 = gaming. The noise is DECOUPLED from scroll —
           scrolling never changes apparent acceleration. */
        float t = uTime * uSpeed;

        /* Apply project-wide desaturation BEFORE composition. Everything
           downstream (chroma test, contribution mix) sees the perceived
           palette, not the raw hex — so a deliberately desaturated mesh
           and an achromatic project look consistent. */
        vec3 colL = desaturate(uColorLeft,  uSaturation);
        vec3 colR = desaturate(uColorRight, uSaturation);

        /* Liquid silhouette in [-1, 1]; lift to [0, 1] then sharpen the
           edge with smoothstep — this is what gives the ferrofluid look
           rather than a soft Gaussian cloud. */
        float lq  = liquid(uv, t);
        float lqL = liquid(uv + vec2(0.06, -0.04), t * 1.1);  // left mass
        float lqR = liquid(uv + vec2(-0.06, 0.04), t * 0.9);  // right mass

        float fluidL = smoothstep(0.05, 0.55, lqL);
        float fluidR = smoothstep(0.05, 0.55, lqR);
        float fluid  = smoothstep(-0.05, 0.45, lq);

        /* Side mask — colL strictly on the left, colR strictly on the
           right. A wide soft falloff at the centre (0.4 → 0.6) is where
           the two streams kiss; that band lights up the refraction. */
        float sideRight = smoothstep(0.35, 0.65, uv.x);
        float sideLeft  = 1.0 - sideRight;

        /* Tighter window centred on x = 0.5 for the refraction highlight. */
        float meet = (1.0 - abs(uv.x - 0.5) * 4.5);
        meet = clamp(meet, 0.0, 1.0);
        meet = pow(meet, 4.0);

        /* Achromatic detection on the *perceived* palette: when chroma is
           low (B&W projects, low uSaturation, or the Liquid Silver default),
           swap to a deeper base + boost the refraction so the fluid reads
           as silver liquid rather than a flat grey wash. */
        float maxChroma = max(chroma(colL), chroma(colR));
        float achromatic = 1.0 - smoothstep(0.05, 0.15, maxChroma);

        vec3 base = mix(uBase, uBaseAchromatic, achromatic);
        float refractionBoost = mix(1.0, 1.8, achromatic);

        /* Symmetric composition — each side carries its own colour with no
           per-side intensity bias. The legacy "right-side toxic-green
           flood" (Section 3's old signature) is intentionally absent:
           per-project palettes now own their identity directly, and the
           mesh is dialled down via uIntensity to stay in the ambient
           layer rather than competing with the central content.
           Multipliers are constants (mid-points of the old uEnergy ramp)
           so visual intensity stays stable regardless of scroll. */
        vec3 contribution = vec3(0.0);
        contribution += colL * fluidL * sideLeft  * 0.95;
        contribution += colR * fluidR * sideRight * 0.95;
        contribution += uRefraction * meet * fluid * 0.675 * refractionBoost;

        vec3 col = base + contribution * uIntensity;

        /* Subtle horizontal banding evokes the layered streams of a liquid
           cooling loop — almost imperceptible, just enough texture. */
        float band = sin(uv.y * 220.0) * 0.5 + 0.5;
        col *= mix(0.94, 1.0, band * 0.18);

        /* Very gentle vignette — keeps the corners from looking flat. */
        vec2 q = vUv - 0.5;
        float vig = smoothstep(1.05, 0.45, length(q) * 1.25);
        col *= mix(0.78, 1.0, vig);

        gl_FragColor = vec4(col, 1.0);
    }
`;

/* ----------------------------------------------------------------------
 * Mesh
 * ---------------------------------------------------------------------- */

function FluidPlane({
    colorLeft,
    colorRight,
    saturation,
    intensity,
}: {
    colorLeft: string;
    colorRight: string;
    saturation: number;
    intensity: number;
}) {
    const matRef = useRef<THREE.ShaderMaterial>(null);

    /* GSAP tweens the channel values of these refs directly — useFrame only
       *reads* them and pushes into the uniforms. This keeps uniform writes
       in the WebGL frame loop while gaining GSAP's easing curves. */
    const colorLeftRef = useRef(new THREE.Color(colorLeft));
    const colorRightRef = useRef(new THREE.Color(colorRight));

    useEffect(() => {
        const target = new THREE.Color(colorLeft);
        gsap.to(colorLeftRef.current, {
            r: target.r,
            g: target.g,
            b: target.b,
            duration: TWEEN_DURATION_S,
            ease: TWEEN_EASE,
            overwrite: true,
        });
    }, [colorLeft]);

    useEffect(() => {
        const target = new THREE.Color(colorRight);
        gsap.to(colorRightRef.current, {
            r: target.r,
            g: target.g,
            b: target.b,
            duration: TWEEN_DURATION_S,
            ease: TWEEN_EASE,
            overwrite: true,
        });
    }, [colorRight]);

    // Saturation / intensity are tuning knobs, not slide-driven values —
    // set them directly without a tween. They only change when the calling
    // page deliberately adjusts the global ambiance.
    useEffect(() => {
        const u = matRef.current?.uniforms;
        if (u) u.uSaturation.value = saturation;
    }, [saturation]);
    useEffect(() => {
        const u = matRef.current?.uniforms;
        if (u) u.uIntensity.value = intensity;
    }, [intensity]);

    useEffect(() => {
        // Kill any in-flight tweens on unmount so they don't keep firing
        // against a stale ref after the canvas is gone.
        const left = colorLeftRef.current;
        const right = colorRightRef.current;
        return () => {
            gsap.killTweensOf(left);
            gsap.killTweensOf(right);
        };
    }, []);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            // Pinned to DEFAULT_SPEED — the shader keeps a constant noise
            // cadence so slide changes never shift the apparent motion.
            uSpeed: { value: DEFAULT_SPEED },
            uSaturation: { value: saturation },
            uIntensity: { value: intensity },
            uAspect: { value: new THREE.Vector2(1, 1) },
            uBase: { value: new THREE.Color('#02050a') },
            uBaseAchromatic: { value: new THREE.Color('#050505') },
            uColorLeft: { value: new THREE.Color(colorLeft) },
            uColorRight: { value: new THREE.Color(colorRight) },
            /* Specular highlight where the streams kiss — pale cyan-white,
               not a brand colour. */
            uRefraction: { value: new THREE.Color('#cdfbff') },
        }),
        // Initial values only — subsequent prop changes feed GSAP-tweened
        // refs that useFrame copies into uniforms.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    useFrame((state, delta) => {
        const u = matRef.current?.uniforms;
        if (!u) return;
        // Cap delta — during fast scroll the browser drops frames, so an
        // uncapped delta lets uTime jump 50–100 ms in a single step. The
        // noise sampler then "skips forward" and the mesh visibly snaps,
        // which the eye reads as "the animation accelerated with my scroll".
        // 1/30 s keeps motion smooth and de-couples it from frame timing.
        const dt = Math.min(delta, 1 / 30);
        u.uTime.value += dt;

        // GSAP-driven targets — just copy the tweened state into uniforms.
        (u.uColorLeft.value as THREE.Color).copy(colorLeftRef.current);
        (u.uColorRight.value as THREE.Color).copy(colorRightRef.current);

        const size = state.size;
        (u.uAspect.value as THREE.Vector2).set(size.width, size.height);
    });

    return (
        <mesh frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                ref={matRef}
                vertexShader={VERTEX_SHADER}
                fragmentShader={FRAGMENT_SHADER}
                uniforms={uniforms}
                depthTest={false}
                depthWrite={false}
            />
        </mesh>
    );
}

/* ----------------------------------------------------------------------
 * Public component
 * ---------------------------------------------------------------------- */

export default function GlobalFluidMesh({
    className,
    colorLeft = DEFAULT_COLOR_LEFT,
    colorRight = DEFAULT_COLOR_RIGHT,
    saturation = DEFAULT_SATURATION,
    intensity = DEFAULT_INTENSITY,
}: FluidMeshProps) {
    // `progress` and `speed` props are intentionally accepted in the type
    // (call sites still pass them) but unused — see header doc.
    return (
        <Canvas
            className={className}
            orthographic
            camera={{
                left: -1,
                right: 1,
                top: 1,
                bottom: -1,
                near: 0.1,
                far: 10,
                position: [0, 0, 1],
                zoom: 1,
            }}
            dpr={[1, 1.5]}
            gl={{ antialias: false, powerPreference: 'low-power' }}
        >
            <FluidPlane
                colorLeft={colorLeft}
                colorRight={colorRight}
                saturation={saturation}
                intensity={intensity}
            />
        </Canvas>
    );
}
