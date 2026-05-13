import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

type ActiveSide = 'none' | 'light' | 'dark';

interface MeniscusLensProps {
    active: ActiveSide;
    lightVideoRef?: RefObject<HTMLVideoElement | null>;
    darkVideoRef?: RefObject<HTMLVideoElement | null>;
}

const VERT = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// The lens samples the page-wide video by mapping its local UV to the
// screen-space region the lens currently occupies (uLensCenter, uLensHalfSize).
// Refraction bends the sampling coordinate in screen-space so distortion is
// proportional to actual viewport pixels, not lens-local pixels.
//
// Two video textures are bound — one per universe. The lens always reveals
// the OPPOSITE side: when active='light', the lens shows the dark video;
// when active='dark', the lens shows the light video.
const FRAG = `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uMotion;
    uniform float uActive;
    uniform float uHasVideoLight;
    uniform float uHasVideoDark;
    uniform sampler2D uVideoLight;
    uniform sampler2D uVideoDark;
    uniform vec2 uLensCenter;
    uniform vec2 uLensHalfSize;

    float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // Procedural fallback when no video is bound (CORS failure, video missing).
    vec3 universeColor(vec2 uv, float side) {
        vec3 pageBg = mix(vec3(0.176, 0.153, 0.220), vec3(0.094, 0.078, 0.118), uv.y);
        if (side < 0.0) {
            vec3 sheet = mix(vec3(1.0, 0.980, 0.941), vec3(0.918, 0.898, 0.863), uv.y * 0.7);
            float radial = smoothstep(0.85, 0.0, distance(uv, vec2(0.2, 1.0)));
            vec3 warmGlow = vec3(1.0, 0.94, 0.80) * radial * 0.30;
            float linDiag = clamp((uv.x + (1.0 - uv.y)) * 0.5, 0.0, 1.0);
            float coverage = mix(0.55, 0.28, linDiag);
            return mix(pageBg, sheet + warmGlow, coverage);
        }
        vec3 ink = mix(vec3(0.031, 0.024, 0.047), vec3(0.078, 0.063, 0.110), uv.y * 0.6);
        float radial = smoothstep(0.85, 0.0, distance(uv, vec2(0.8, 1.0)));
        vec3 purpleGlow = vec3(0.216, 0.188, 0.255) * radial * 0.55;
        float linDiag = clamp((1.0 - uv.x + uv.y) * 0.5, 0.0, 1.0);
        float coverage = mix(0.85, 0.55, linDiag);
        return mix(pageBg, ink + purpleGlow, coverage);
    }

    // Three.js VideoTexture is uploaded with flipY=true, so we flip Y here
    // to stay in HTML conventions (0,0 = top-left).
    vec3 sampleLight(vec2 screenUv) {
        return texture2D(uVideoLight, vec2(screenUv.x, 1.0 - screenUv.y)).rgb;
    }
    vec3 sampleDark(vec2 screenUv) {
        return texture2D(uVideoDark, vec2(screenUv.x, 1.0 - screenUv.y)).rgb;
    }
    // Pick whichever video belongs to the OPPOSITE universe.
    // uActive > 0 → active=light → reveal dark side.
    // uActive < 0 → active=dark  → reveal light side.
    vec3 sampleLens(vec2 screenUv) {
        vec3 cl = sampleLight(screenUv);
        vec3 cd = sampleDark(screenUv);
        return mix(cl, cd, step(0.5, uActive));
    }

    void main() {
        vec2 uv = vUv;
        vec2 centered = uv - 0.5;
        float r = length(centered) * 2.0;
        if (r > 1.05) discard;

        float wobble = uMotion * 0.012 * (noise(uv * 5.0 + uTime * 0.35) - 0.5);
        float er = r + wobble;

        float k = 1.6;
        float oneMinusR2 = max(0.0, 1.0 - er * er);
        float dhdr = -2.0 * er * k * pow(max(0.0001, oneMinusR2), max(0.0, k - 1.0));

        vec2 unitDir = er > 0.001 ? centered * 2.0 / er : vec2(0.0);
        vec2 slope = unitDir * dhdr;
        vec3 normal = normalize(vec3(-slope.x, -slope.y, 1.0));

        float distortionMask = (1.0 - er) * er * 1.8;
        float strength = 0.22 * distortionMask;

        vec2 refractedLocalUv = uv - normal.xy * strength;

        vec2 localCentered = uv - 0.5;
        vec2 screenUv = uLensCenter + localCentered * 2.0 * uLensHalfSize;
        vec2 screenRefractedOffset = normal.xy * strength * 2.0 * uLensHalfSize;
        vec2 refractedScreenUv = screenUv - screenRefractedOffset;

        float chroma = 0.014 * smoothstep(0.55, 1.0, er);
        vec2 dir = er > 0.001 ? centered / er : vec2(0.0);

        vec3 col;
        bool hasBothVideos = uHasVideoLight > 0.5 && uHasVideoDark > 0.5;
        if (hasBothVideos) {
            vec2 chromaScreen = dir * chroma * 2.0 * uLensHalfSize;
            col.r = sampleLens(refractedScreenUv + chromaScreen).r;
            col.g = sampleLens(refractedScreenUv).g;
            col.b = sampleLens(refractedScreenUv - chromaScreen).b;
        } else {
            col.r = universeColor(refractedLocalUv + dir * chroma, uActive).r;
            col.g = universeColor(refractedLocalUv, uActive).g;
            col.b = universeColor(refractedLocalUv - dir * chroma, uActive).b;
        }

        float caustic = smoothstep(0.84, 0.94, er) - smoothstep(0.94, 1.0, er);
        col += vec3(0.95, 0.92, 0.88) * caustic * 0.45;

        vec3 lightDir = normalize(vec3(-0.35, 0.55, 1.0));
        float spec = pow(max(dot(normal, lightDir), 0.0), 70.0);
        col += vec3(1.0, 0.98, 0.94) * spec * 0.55;

        float rimDark = smoothstep(0.55, 1.0, er) * 0.18;
        col *= (1.0 - rimDark);

        float lift = (1.0 - er) * 0.04;
        col += vec3(lift);

        float alpha = 1.0 - smoothstep(0.985, 1.005, er);
        if (alpha < 0.001) discard;

        gl_FragColor = vec4(col, alpha);
    }
`;

function bindVideoTexture(
    video: HTMLVideoElement,
    onReady: (tex: THREE.VideoTexture) => void
): () => void {
    const bind = () => {
        const tex = new THREE.VideoTexture(video);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        onReady(tex);
    };

    if (video.readyState >= 2) {
        bind();
        return () => {};
    }
    video.addEventListener('loadeddata', bind, { once: true });
    return () => video.removeEventListener('loadeddata', bind);
}

function LensMesh({
    activeSide,
    motionOk,
    lightVideoRef,
    darkVideoRef,
}: {
    activeSide: ActiveSide;
    motionOk: boolean;
    lightVideoRef?: RefObject<HTMLVideoElement | null>;
    darkVideoRef?: RefObject<HTMLVideoElement | null>;
}) {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const lightTexRef = useRef<THREE.VideoTexture | null>(null);
    const darkTexRef = useRef<THREE.VideoTexture | null>(null);
    const { gl } = useThree();

    useEffect(() => {
        const video = lightVideoRef?.current;
        if (!video) return;
        return bindVideoTexture(video, (tex) => {
            lightTexRef.current = tex;
            if (matRef.current) {
                matRef.current.uniforms.uVideoLight.value = tex;
                matRef.current.uniforms.uHasVideoLight.value = 1;
            }
        });
    }, [lightVideoRef]);

    useEffect(() => {
        const video = darkVideoRef?.current;
        if (!video) return;
        return bindVideoTexture(video, (tex) => {
            darkTexRef.current = tex;
            if (matRef.current) {
                matRef.current.uniforms.uVideoDark.value = tex;
                matRef.current.uniforms.uHasVideoDark.value = 1;
            }
        });
    }, [darkVideoRef]);

    useEffect(() => {
        return () => {
            lightTexRef.current?.dispose();
            darkTexRef.current?.dispose();
            lightTexRef.current = null;
            darkTexRef.current = null;
        };
    }, []);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uMotion: { value: motionOk ? 1 : 0 },
            uActive: { value: 0 },
            uHasVideoLight: { value: 0 },
            uHasVideoDark: { value: 0 },
            uVideoLight: { value: null as THREE.Texture | null },
            uVideoDark: { value: null as THREE.Texture | null },
            uLensCenter: { value: new THREE.Vector2(0.5, 0.5) },
            uLensHalfSize: { value: new THREE.Vector2(0.1, 0.1) },
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    useEffect(() => {
        if (!matRef.current) return;
        const target = activeSide === 'light' ? 1 : activeSide === 'dark' ? -1 : 0;
        matRef.current.uniforms.uActive.value = target;
        matRef.current.uniforms.uMotion.value = motionOk ? 1 : 0;
    }, [activeSide, motionOk]);

    useFrame((state) => {
        if (!matRef.current) return;
        if (motionOk) {
            matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
        const dom = gl.domElement;
        const rect = dom.getBoundingClientRect();
        const vw = window.innerWidth || 1;
        const vh = window.innerHeight || 1;
        matRef.current.uniforms.uLensCenter.value.set(
            (rect.left + rect.width / 2) / vw,
            (rect.top + rect.height / 2) / vh
        );
        matRef.current.uniforms.uLensHalfSize.value.set(
            rect.width / 2 / vw,
            rect.height / 2 / vh
        );
    });

    return (
        <mesh>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                ref={matRef}
                vertexShader={VERT}
                fragmentShader={FRAG}
                uniforms={uniforms}
                transparent
                depthWrite={false}
            />
        </mesh>
    );
}

export default function MeniscusLens({ active, lightVideoRef, darkVideoRef }: MeniscusLensProps) {
    const [motionOk, setMotionOk] = useState(true);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setMotionOk(!mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    return (
        <Canvas
            orthographic
            camera={{ left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 10, position: [0, 0, 1] }}
            gl={{ alpha: true, antialias: true, premultipliedAlpha: false }}
            style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
            dpr={[1, 2]}
            frameloop="always"
        >
            <LensMesh
                activeSide={active}
                motionOk={motionOk}
                lightVideoRef={lightVideoRef}
                darkVideoRef={darkVideoRef}
            />
        </Canvas>
    );
}
