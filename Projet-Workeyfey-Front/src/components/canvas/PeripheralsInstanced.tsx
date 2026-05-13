import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createPeripheralSchemaTexture } from './peripheralSchemaTexture';

type Tuple3 = [number, number, number];

interface Props {
    positions: Tuple3[];
    progressRef: { current: { value: number } };
    revealStart?: number;
    revealEnd?: number;
    debugForceVisible?: boolean;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

const ROTATIONS: Tuple3[] = [
    [0, 0, 0],
    [0, 1.002, 0],
    [0, 1.087, 0],
    [0, -Math.PI / 9, 0],
    [0, -0.793, 0],
    [0, 1.222, 0],
    [0, 0.539, 0],
    [0, 0.429, 0],
    [0, -Math.PI / 3, 0],
];

export default function PeripheralsInstanced({
    positions,
    progressRef,
    revealStart = 0.18,
    revealEnd = 0.34,
    debugForceVisible = false,
}: Props) {
    const bodyRef = useRef<THREE.InstancedMesh>(null);
    const screenRef = useRef<THREE.InstancedMesh>(null);

    const screenTextures = useMemo(
        () => positions.map((_, i) => createPeripheralSchemaTexture(i)),
        [positions],
    );

    const screenMaterials = useMemo(
        () =>
            screenTextures.map(
                (tex) =>
                    new THREE.MeshStandardMaterial({
                        color: '#000810',
                        emissive: new THREE.Color('#00E5FF'),
                        emissiveMap: tex,
                        emissiveIntensity: 0.95,
                        roughness: 0.55,
                        metalness: 0.15,
                        toneMapped: false,
                    }),
            ),
        [screenTextures],
    );

    const bodyMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: '#0a0f14',
                roughness: 0.65,
                metalness: 0.45,
            }),
        [],
    );

    useEffect(() => {
        return () => {
            screenTextures.forEach((t) => t.dispose());
            screenMaterials.forEach((m) => m.dispose());
            bodyMaterial.dispose();
        };
    }, [screenTextures, screenMaterials, bodyMaterial]);

    useEffect(() => {
        if (!bodyRef.current) return;
        for (let i = 0; i < positions.length; i++) {
            const p = positions[i];
            const r = ROTATIONS[i] ?? [0, 0, 0];
            _e.set(r[0], r[1], r[2]);
            _q.setFromEuler(_e);
            _v.set(p[0], p[1], p[2]);
            _s.set(0.55, 0.55, 0.55);
            _m.compose(_v, _q, _s);
            bodyRef.current.setMatrixAt(i, _m);
        }
        bodyRef.current.instanceMatrix.needsUpdate = true;
    }, [positions]);

    useFrame(() => {
        const p = progressRef.current.value;
        const reveal = THREE.MathUtils.smoothstep(p, revealStart, revealEnd);
        const fadeOut = 1 - THREE.MathUtils.smoothstep(p, 0.46, 0.58);
        const visibility = debugForceVisible ? 1 : reveal * fadeOut;

        if (bodyRef.current) {
            bodyRef.current.visible = debugForceVisible || visibility > 0.01;
            const scale = 0.55 * (0.4 + 0.6 * visibility);
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                const r = ROTATIONS[i] ?? [0, 0, 0];
                _e.set(r[0], r[1], r[2]);
                _q.setFromEuler(_e);
                _v.set(pos[0], pos[1], pos[2]);
                _s.setScalar(scale);
                _m.compose(_v, _q, _s);
                bodyRef.current.setMatrixAt(i, _m);
            }
            bodyRef.current.instanceMatrix.needsUpdate = true;
        }

        screenMaterials.forEach((m) => {
            m.emissiveIntensity = 0.4 + 1.4 * visibility;
            m.opacity = visibility;
            m.transparent = visibility < 0.99;
        });

        if (screenRef.current) {
            screenRef.current.visible = debugForceVisible || visibility > 0.01;
        }
    });

    return (
        <>
            <instancedMesh
                ref={bodyRef}
                args={[undefined, undefined, positions.length]}
                material={bodyMaterial}
                frustumCulled={false}
            >
                <boxGeometry args={[0.9, 0.6, 0.7]} />
            </instancedMesh>

            {positions.map((pos, i) => {
                const r = ROTATIONS[i] ?? [0, 0, 0];
                return (
                    <mesh
                        key={i}
                        position={[pos[0], pos[1] + 0.15, pos[2]]}
                        rotation={r}
                        material={screenMaterials[i]}
                    >
                        <planeGeometry args={[0.7, 0.45]} />
                    </mesh>
                );
            })}
        </>
    );
}
