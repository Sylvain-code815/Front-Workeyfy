import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createBraidTexture } from './cableTexture';

interface CablesProps {
    pcPositions: [number, number, number][];
    heroPosition?: [number, number, number];
    linksPerPc?: number;
    linksToHero?: number;
    radius?: number;
    color?: string;
}

export default function Cables({
    pcPositions,
    heroPosition,
    linksPerPc = 2,
    linksToHero = 2,
    radius = 0.025,
    color = '#00d4ff',
}: CablesProps) {
    const braidTex = useMemo(() => createBraidTexture(), []);

    const material = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: '#001018',
                emissive: new THREE.Color(color),
                emissiveIntensity: 1.5,
                emissiveMap: braidTex,
                roughness: 0.4,
                metalness: 0.2,
                toneMapped: false,
            }),
        [braidTex, color],
    );

    const curves = useMemo(() => {
        const result: THREE.CatmullRomCurve3[] = [];
        const seen = new Set<string>();
        let seed = 1;
        const rand = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };

        const cableOrigin = (p: [number, number, number]) =>
            new THREE.Vector3(p[0], p[1] + 0.35, p[2] - 0.15);

        const makeCurve = (start: THREE.Vector3, end: THREE.Vector3) => {
            const sag = Math.min(0.45, start.distanceTo(end) * 0.18);
            const mid = new THREE.Vector3(
                (start.x + end.x) / 2 + (rand() - 0.5) * 0.2,
                Math.min(start.y, end.y) - sag + (rand() - 0.5) * 0.08,
                (start.z + end.z) / 2 + (rand() - 0.5) * 0.2,
            );
            return new THREE.CatmullRomCurve3([start, mid, end]);
        };

        pcPositions.forEach((pos, i) => {
            const me = cableOrigin(pos);
            const sorted = pcPositions
                .map((other, j) => ({
                    j,
                    d: i === j ? Infinity : me.distanceTo(cableOrigin(other)),
                }))
                .sort((a, b) => a.d - b.d);
            for (let k = 0; k < Math.min(linksPerPc, sorted.length); k++) {
                const j = sorted[k].j;
                const key = i < j ? `${i}-${j}` : `${j}-${i}`;
                if (seen.has(key)) continue;
                seen.add(key);
                result.push(makeCurve(me, cableOrigin(pcPositions[j])));
            }
        });

        if (heroPosition && linksToHero > 0) {
            const hero = new THREE.Vector3(
                heroPosition[0],
                heroPosition[1] + 0.5,
                heroPosition[2],
            );
            const sortedToHero = pcPositions
                .map((p, idx) => ({ idx, d: hero.distanceTo(cableOrigin(p)) }))
                .sort((a, b) => a.d - b.d);
            for (let k = 0; k < Math.min(linksToHero, sortedToHero.length); k++) {
                const start = cableOrigin(pcPositions[sortedToHero[k].idx]);
                result.push(makeCurve(start, hero.clone()));
            }
        }

        return result;
    }, [pcPositions, heroPosition, linksPerPc, linksToHero]);

    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        material.emissiveIntensity = 1.4 + 0.4 * Math.sin(t * 0.7);
        if (material.emissiveMap) {
            material.emissiveMap.offset.y = -t * 0.08;
        }
    });

    return (
        <group>
            {curves.map((curve, i) => (
                <mesh key={i} material={material}>
                    <tubeGeometry args={[curve, 12, radius, 6, false]} />
                </mesh>
            ))}
        </group>
    );
}
