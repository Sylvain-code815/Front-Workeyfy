import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
    progressRef: { current: { value: number } };
    debugForceVisible?: boolean;
}

const RACK_COUNT = 28;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

export default function ServerRoom({ progressRef, debugForceVisible = false }: Props) {
    const racksRef = useRef<THREE.InstancedMesh>(null);
    const ledsRef = useRef<THREE.InstancedMesh>(null);
    const groupRef = useRef<THREE.Group>(null);

    const layout = useMemo(() => {
        const items: { pos: [number, number, number]; rot: number }[] = [];
        let i = 0;
        for (let row = 0; row < 4; row++) {
            const z = -8 - row * 4;
            for (let col = 0; col < 7; col++) {
                if (i >= RACK_COUNT) break;
                const side = col < 4 ? -1 : 1;
                const xBase = side === -1 ? -3.5 - col * 1.4 : 3.5 + (col - 4) * 1.4;
                items.push({
                    pos: [xBase, 1, z],
                    rot: side === -1 ? Math.PI / 2 : -Math.PI / 2,
                });
                i++;
            }
        }
        return items.slice(0, RACK_COUNT);
    }, []);

    const rackMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: '#1a232c',
                roughness: 0.7,
                metalness: 0.6,
                emissive: new THREE.Color('#00d4ff'),
                emissiveIntensity: 0.05,
            }),
        [],
    );

    const ledMaterial = useMemo(
        () =>
            new THREE.MeshBasicMaterial({
                color: '#7FF7E8',
                transparent: true,
                opacity: 0.9,
                toneMapped: false,
            }),
        [],
    );

    useEffect(() => {
        return () => {
            rackMaterial.dispose();
            ledMaterial.dispose();
        };
    }, [rackMaterial, ledMaterial]);

    useEffect(() => {
        if (!racksRef.current || !ledsRef.current) return;
        for (let i = 0; i < layout.length; i++) {
            const item = layout[i];
            _e.set(0, item.rot, 0);
            _q.setFromEuler(_e);
            _v.set(item.pos[0], item.pos[1], item.pos[2]);
            _s.set(1, 1, 1);
            _m.compose(_v, _q, _s);
            racksRef.current.setMatrixAt(i, _m);

            _v.set(item.pos[0], item.pos[1] + 0.6, item.pos[2]);
            _s.set(0.7, 0.05, 0.06);
            _m.compose(_v, _q, _s);
            ledsRef.current.setMatrixAt(i, _m);
        }
        racksRef.current.instanceMatrix.needsUpdate = true;
        ledsRef.current.instanceMatrix.needsUpdate = true;
    }, [layout]);

    useFrame(({ clock }) => {
        const p = progressRef.current.value;
        const reveal = THREE.MathUtils.smoothstep(p, 0.18, 0.36);
        const decay = 1 - THREE.MathUtils.smoothstep(p, 0.42, 0.55);
        const visibility = debugForceVisible ? 1 : reveal * decay;
        if (groupRef.current) {
            groupRef.current.visible = debugForceVisible || visibility > 0.01;
            groupRef.current.scale.setScalar(0.6 + 0.4 * visibility);
        }
        rackMaterial.emissiveIntensity = 0.05 + visibility * 0.6;
        ledMaterial.opacity = 0.4 + 0.6 * Math.abs(Math.sin(clock.elapsedTime * 2.1)) * visibility;
    });

    return (
        <group ref={groupRef} position={[0, -0.2, 0]}>
            <instancedMesh
                ref={racksRef}
                args={[undefined, undefined, layout.length]}
                material={rackMaterial}
                frustumCulled={false}
            >
                <boxGeometry args={[0.9, 2.0, 0.6]} />
            </instancedMesh>

            <instancedMesh
                ref={ledsRef}
                args={[undefined, undefined, layout.length]}
                material={ledMaterial}
                frustumCulled={false}
            >
                <boxGeometry args={[1, 1, 1]} />
            </instancedMesh>
        </group>
    );
}
