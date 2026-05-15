import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Bubble palette — Roblox blue → cyan → FiveM green, the same data-fluid
// spectrum running through the upper sections. Vertices pick a color from
// this list so each bubble belongs to the same chromatic family without
// looking uniform.
const PALETTE = [
    new THREE.Color('#1E73FF'),
    new THREE.Color('#3F92FF'),
    new THREE.Color('#5EB0FF'),
    new THREE.Color('#7FE3FF'),
    new THREE.Color('#5EE6B5'),
    new THREE.Color('#4ADE80'),
    new THREE.Color('#1FE873'),
];

const BUBBLE_COUNT = 650;

// Soft radial sprite — 64×64 white circle with a smooth alpha falloff.
// Used as the bubble billboard map so each point reads as a round droplet
// instead of WebGL's default square sprite.
function makeBubbleTexture() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.12)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
}

function Bubbles() {
    const ref = useRef<THREE.Points>(null);
    const texture = useMemo(() => makeBubbleTexture(), []);

    const { geometry, basePositions, phases } = useMemo(() => {
        const positions = new Float32Array(BUBBLE_COUNT * 3);
        const colors = new Float32Array(BUBBLE_COUNT * 3);
        const phasesArr = new Float32Array(BUBBLE_COUNT * 3);

        for (let i = 0; i < BUBBLE_COUNT; i++) {
            const b = i * 3;
            // Wide volumetric cloud, concentrated near the centre where the
            // title sits (Math.pow with exponent > 1 biases the radius toward
            // small values). Camera is at z=5.4 / fov=38° so r up to ~4.5
            // keeps bubbles inside the visible frustum.
            const theta = Math.random() * Math.PI * 2;
            const r = 0.2 + Math.pow(Math.random(), 1.4) * 4.5;
            positions[b + 0] = Math.cos(theta) * r;
            positions[b + 1] = (Math.random() - 0.5) * 5.2;
            positions[b + 2] = Math.sin(theta) * r * 0.65 - 0.4;

            const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
            colors[b + 0] = c.r;
            colors[b + 1] = c.g;
            colors[b + 2] = c.b;

            phasesArr[b + 0] = Math.random() * Math.PI * 2;
            phasesArr[b + 1] = Math.random() * Math.PI * 2;
            phasesArr[b + 2] = Math.random() * Math.PI * 2;
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return {
            geometry: geom,
            basePositions: positions.slice(),
            phases: phasesArr,
        };
    }, []);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.getElapsedTime();
        const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
        const arr = pos.array as Float32Array;
        // Slow, irregular sine drift on three axes per bubble — gives the
        // "underwater / floating in space" feeling rather than a rotation.
        for (let i = 0; i < arr.length; i += 3) {
            arr[i + 0] = basePositions[i + 0] + Math.sin(t * 0.10 + phases[i + 0]) * 0.55;
            arr[i + 1] = basePositions[i + 1] + Math.cos(t * 0.12 + phases[i + 1]) * 0.70;
            arr[i + 2] = basePositions[i + 2] + Math.sin(t * 0.09 + phases[i + 2]) * 0.40;
        }
        pos.needsUpdate = true;
        ref.current.rotation.y = t * 0.012;
    });

    return (
        <points ref={ref} geometry={geometry}>
            <pointsMaterial
                size={0.22}
                map={texture ?? undefined}
                alphaMap={texture ?? undefined}
                vertexColors
                transparent
                opacity={1.0}
                sizeAttenuation
                toneMapped={false}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
}

export default function FooterHeroScene() {
    return (
        <>
            <color attach="background" args={['#02050a']} />
            <ambientLight intensity={0.45} />
            <Bubbles />
        </>
    );
}
