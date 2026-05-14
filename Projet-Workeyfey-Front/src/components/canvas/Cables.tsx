import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
const diffuseUrl = '/textures/faux_fur_geometric_1k/faux_fur_geometric_diff_1k.jpg';
const normalUrl = '/textures/faux_fur_geometric_1k/faux_fur_geometric_nor_gl_1k.jpg';
const roughUrl = '/textures/faux_fur_geometric_1k/faux_fur_geometric_rough_1k.jpg';

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
    radius = 0.032,
    color = '#00E5FF',
}: CablesProps) {
    // Textures de tressage : faux_fur_geometric_1k importé via Vite
    // (les imports sont résolus en URL hashée par le bundler).
    const cableTextures = useTexture({
        diffuse: diffuseUrl,
        normal: normalUrl,
        rough: roughUrl,
    });

    // Repeat (10, 1) : tresses plus larges, donc visibles de loin sans
    // ressembler à un blob uniforme.
    useEffect(() => {
        const list = [
            cableTextures.diffuse,
            cableTextures.normal,
            cableTextures.rough,
        ];
        list.forEach((tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            // 50 répétitions : maillage lisible, ni écrasé ni étalé.
            tex.repeat.set(50, 1);
            // Anisotropy max : tresses nettes même sur les câbles vus de profil.
            tex.anisotropy = 16;
            tex.minFilter = THREE.LinearMipMapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = true;
            tex.needsUpdate = true;
        });
    }, [cableTextures]);

    const material = useMemo(() => {
        const mat = new THREE.MeshStandardMaterial({
            map: cableTextures.diffuse,
            normalMap: cableTextures.normal,
            normalScale: new THREE.Vector2(0.5, 0.5),
            roughnessMap: cableTextures.rough,
            // Roughness 0.3 : les câbles "sparklent" sous la mouse light,
            // contraste avec le desk plus mat à 0.7.
            roughness: 0.3,
            metalness: 0.6,
            emissive: new THREE.Color(color),
            emissiveMap: cableTextures.diffuse,
            // Emissive quasi-nul : c'est la mouse light qui doit révéler
            // le tressage en balayant le câble.
            emissiveIntensity: 0.05,
            toneMapped: false,
        });
        mat.color.set('#00E5FF');
        return mat;
    }, [cableTextures, color]);

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
        // Respiration imperceptible : 0.05 ± 0.02. Le câble reste sombre.
        material.emissiveIntensity = 0.05 + 0.02 * Math.sin(t * 0.7);
        if (material.map) material.map.offset.y = -t * 0.08;
        if (material.emissiveMap) material.emissiveMap.offset.y = -t * 0.08;
        if (material.normalMap) material.normalMap.offset.y = -t * 0.08;
        if (material.roughnessMap) material.roughnessMap.offset.y = -t * 0.08;
    });

    return (
        <group>
            {curves.map((curve, i) => (
                <mesh key={i} material={material}>
                    {/* 128 segments tubulaires + 12 radiaux : tube bien rond,
                        courbes lisses, le normal map se déploie proprement. */}
                    <tubeGeometry args={[curve, 128, radius, 12, false]} />
                </mesh>
            ))}
        </group>
    );
}
