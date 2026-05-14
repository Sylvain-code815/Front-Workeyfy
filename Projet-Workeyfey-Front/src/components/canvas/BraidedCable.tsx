import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const diffuseUrl = '/textures/garden_hose_wall_mounted_01_1k/garden_hose_wall_mounted_01_diff_1k.png';
const normalUrl = '/textures/garden_hose_wall_mounted_01_1k/garden_hose_wall_mounted_01_nor_gl_1k.png';
const roughnessUrl = '/textures/garden_hose_wall_mounted_01_1k/garden_hose_wall_mounted_01_rough_1k.png';

interface BraidedCableProps {
    curve: THREE.CatmullRomCurve3;
    radius?: number;
    color?: string;
    emissive?: string;
    emissiveIntensity?: number;
    metalness?: number;
    normalScale?: number;
    /** Tiles per world unit along the cable length. */
    tilesPerUnit?: number;
}

export default function BraidedCable({
    curve,
    radius = 0.04,
    color = '#00E5FF',
    emissive = '#003366',
    emissiveIntensity = 0.5,
    metalness = 0.3,
    normalScale = 1.0,
    tilesPerUnit = 2,
}: BraidedCableProps) {
    const [diffuseSrc, normalSrc, roughnessSrc] = useTexture([
        diffuseUrl,
        normalUrl,
        roughnessUrl,
    ]);

    const cableLength = useMemo(() => curve.getLength(), [curve]);

    const { geometry, diffuseMap, normalMap, roughnessMap, normalScaleVec } = useMemo(() => {
        const repeatV = Math.max(1, Math.round(cableLength * tilesPerUnit));

        const configClone = (src: THREE.Texture, isColor: boolean) => {
            const t = src.clone();
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(1, repeatV);
            if (isColor) t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = 8;
            t.needsUpdate = true;
            return t;
        };

        return {
            geometry: new THREE.TubeGeometry(curve, 32, radius, 8, false),
            diffuseMap: configClone(diffuseSrc, true),
            normalMap: configClone(normalSrc, false),
            roughnessMap: configClone(roughnessSrc, false),
            normalScaleVec: new THREE.Vector2(normalScale, normalScale),
        };
    }, [curve, cableLength, diffuseSrc, normalSrc, roughnessSrc, tilesPerUnit, radius, normalScale]);

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial
                color={color}
                map={diffuseMap}
                normalMap={normalMap}
                normalScale={normalScaleVec}
                roughnessMap={roughnessMap}
                metalness={metalness}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
            />
        </mesh>
    );
}

useTexture.preload([diffuseUrl, normalUrl, roughnessUrl]);
