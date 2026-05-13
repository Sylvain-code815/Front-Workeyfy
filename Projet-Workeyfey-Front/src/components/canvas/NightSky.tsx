import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Couleurs spec : noir profond au zénith → bleu nuit très sombre à l'horizon.
// Fog scène doit reprendre HORIZON pour transition invisible route↔ciel.
export const NIGHT_SKY_ZENITH = '#010205';
export const NIGHT_SKY_HORIZON = '#040a14';

// Lune par défaut : haute, légèrement décalée à droite, très loin → s'inscrit
// dans la perspective de la rue sans dominer le cadre.
const DEFAULT_MOON_POS: [number, number, number] = [50, 80, -150];
const DEFAULT_MOON_RADIUS = 6;

const HALO_RGB: [number, number, number] = [185, 213, 255];

// Texture procédurale de halo radial (CanvasTexture) : transparent au centre
// → opaque léger → fade à 0. Utilisée par la lune visible ET sa version dans
// l'environnement de réflexion (intensités différentes).
function makeRadialGlow(rgb: [number, number, number]): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return new THREE.Texture();
    }
    const [r, g, b] = rgb;
    const gradient = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2,
    );
    gradient.addColorStop(0, `rgba(${r},${g},${b},1)`);
    gradient.addColorStop(0.30, `rgba(${r},${g},${b},0.45)`);
    gradient.addColorStop(0.65, `rgba(${r},${g},${b},0.10)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
}

// Sphere radius=500, BackSide : on est À L'INTÉRIEUR. Le shader lit la
// direction-monde du fragment et fait gradient HORIZON→ZENITH le long de y.
// Pas de pixels visibles (c'est du code), pas de tiling, pas de seam.
function SkyDome({
    zenith,
    horizon,
    exponent = 0.55,
}: {
    zenith: string;
    horizon: string;
    exponent?: number;
}) {
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(zenith) },
                bottomColor: { value: new THREE.Color(horizon) },
                exponent: { value: exponent },
            },
            vertexShader: /* glsl */ `
                varying vec3 vDir;
                void main() {
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);
                    vDir = normalize(worldPos.xyz);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float exponent;
                varying vec3 vDir;
                void main() {
                    float h = max(vDir.y, 0.0);
                    float t = pow(h, exponent);
                    gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
                }
            `,
            side: THREE.BackSide,
            depthWrite: false,
            // toneMapped:false → couleurs sRGB sortent telles quelles.
            // Sky est déjà très sombre, pas besoin de la compression ACES.
            toneMapped: false,
        });
    }, [zenith, horizon, exponent]);

    return (
        <mesh material={material} renderOrder={-1000}>
            <sphereGeometry args={[500, 48, 24]} />
        </mesh>
    );
}

// Disque lumineux de la Lune. Color blanc × intensity (3) → valeur HDR > 1
// qui passe le seuil de Bloom (0.6). toneMapped:false pour ne pas se faire
// écraser par ACES. CircleGeometry billboardé → toujours face caméra,
// jamais de déformation perspective.
function Moon({
    position,
    radius,
    intensity,
}: {
    position: [number, number, number];
    radius: number;
    intensity: number;
}) {
    const moonColor = useMemo(
        () => new THREE.Color('#ffffff').multiplyScalar(intensity),
        [intensity],
    );
    return (
        <Billboard position={position}>
            <mesh>
                <circleGeometry args={[radius, 64]} />
                <meshBasicMaterial color={moonColor} toneMapped={false} />
            </mesh>
        </Billboard>
    );
}

// Halo atmosphérique : sprite radial bleu pâle, opacité faible (0.1 spec).
// L'astuce : on le rend BIEN plus large que le disque lunaire (×9) →
// suggère que l'air autour de la lune diffuse sa lumière, pas la lune elle-même.
function MoonHalo({
    position,
    scale,
    opacity,
}: {
    position: [number, number, number];
    scale: number;
    opacity: number;
}) {
    const haloTex = useMemo(() => makeRadialGlow(HALO_RGB), []);
    return (
        <sprite position={position} scale={[scale, scale, 1]} renderOrder={-500}>
            <spriteMaterial
                map={haloTex}
                color="#b9d5ff"
                transparent
                opacity={opacity}
                depthWrite={false}
                toneMapped={false}
            />
        </sprite>
    );
}

// Étoiles distantes : Points avec 1000 particules dans l'hémisphère supérieur,
// taille pixel (sizeAttenuation off) → toujours 1.5 px peu importe le zoom.
// Couleur volontairement très désaturée et opacité minuscule : on doit
// scruter le ciel pour les voir. Scintillement très subtil (lerp opacité).
function Stars({
    count = 1000,
    radius = 480,
}: {
    count?: number;
    radius?: number;
}) {
    const matRef = useRef<THREE.PointsMaterial>(null);

    const geometry = useMemo(() => {
        const positions = new Float32Array(count * 3);
        let s = 1729;
        const rand = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
        for (let i = 0; i < count; i++) {
            // Hémisphère sup uniquement (y > 0) : pas d'étoiles sous le sol.
            const u = rand();
            const v = rand() * 0.5;
            const theta = Math.acos(1 - 2 * v);
            const phi = 2 * Math.PI * u;
            positions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
            positions[i * 3 + 1] = radius * Math.cos(theta);
            positions[i * 3 + 2] = radius * Math.sin(theta) * Math.sin(phi);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return geo;
    }, [count, radius]);

    useFrame(({ clock }) => {
        const m = matRef.current;
        if (!m) return;
        // Oscille très lentement entre 0.06 et 0.12. Pas un strobe — un
        // souffle. C'est ce qui sépare le "Premium" du kitsch.
        m.opacity = 0.09 + 0.03 * Math.sin(clock.elapsedTime * 0.7);
    });

    return (
        <points geometry={geometry} renderOrder={-900}>
            <pointsMaterial
                ref={matRef}
                color="#7a8aa0"
                size={1.5}
                sizeAttenuation={false}
                transparent
                opacity={0.09}
                depthWrite={false}
                toneMapped={false}
            />
        </points>
    );
}

// Sous-arbre rendu hors-écran par <Environment> dans une cubemap. C'est
// CETTE image que MeshReflectorMaterial / MeshStandardMaterial vont utiliser
// comme source d'envMap → le bitume mouillé reflète notre lune procédurale,
// pas un noir mat. Halo boosté (0.5) parce qu'à 256² la cubemap floute déjà.
function ReflectionSky({
    moonPos,
    moonRadius,
    zenith,
    horizon,
    moonIntensity,
}: {
    moonPos: [number, number, number];
    moonRadius: number;
    zenith: string;
    horizon: string;
    moonIntensity: number;
}) {
    const haloTex = useMemo(() => makeRadialGlow(HALO_RGB), []);
    const moonColor = useMemo(
        () => new THREE.Color('#ffffff').multiplyScalar(moonIntensity),
        [moonIntensity],
    );
    return (
        <>
            <SkyDome zenith={zenith} horizon={horizon} />
            <Billboard position={moonPos}>
                <mesh>
                    <circleGeometry args={[moonRadius, 32]} />
                    <meshBasicMaterial color={moonColor} toneMapped={false} />
                </mesh>
            </Billboard>
            <sprite position={moonPos} scale={[moonRadius * 9, moonRadius * 9, 1]}>
                <spriteMaterial
                    map={haloTex}
                    color="#b9d5ff"
                    transparent
                    opacity={0.5}
                    depthWrite={false}
                />
            </sprite>
        </>
    );
}

export type NightSkyProps = {
    moonPos?: [number, number, number];
    moonRadius?: number;
    moonIntensity?: number;
    zenith?: string;
    horizon?: string;
    haloOpacity?: number;
    haloScale?: number;
    showStars?: boolean;
    starCount?: number;
    lightIntensity?: number;
    lightColor?: string;
    castShadow?: boolean;
    reflectionResolution?: number;
};

/**
 * Nuit procédurale de haute précision : dome dégradé + lune émissive +
 * halo atmosphérique + étoiles + DirectionalLight co-localisée + cubemap
 * de réflexion à partir de copies simplifiées. Remplace tout HDRI.
 *
 * Avantages vs HDRI :
 *   - Netteté absolue (du code, pas des pixels) — propre en 8K.
 *   - Lune alignable précisément avec l'axe de la rue → reflet centré.
 *   - Fog peut prendre exactement la couleur de l'horizon → ville infinie.
 *   - DirectionalLight position == Lune visible → traînée de reflet alignée.
 */
export default function NightSky({
    moonPos = DEFAULT_MOON_POS,
    moonRadius = DEFAULT_MOON_RADIUS,
    moonIntensity = 2.4,
    zenith = NIGHT_SKY_ZENITH,
    horizon = NIGHT_SKY_HORIZON,
    haloOpacity = 0.18,
    haloScale,
    showStars = true,
    starCount = 1000,
    lightIntensity = 3,
    lightColor = '#b9d5ff',
    castShadow = true,
    reflectionResolution = 256,
}: NightSkyProps = {}) {
    const haloFinalScale = haloScale ?? moonRadius * 9;

    return (
        <>
            <SkyDome zenith={zenith} horizon={horizon} />
            <Stars count={showStars ? starCount : 0} />
            <Moon position={moonPos} radius={moonRadius} intensity={moonIntensity} />
            <MoonHalo position={moonPos} scale={haloFinalScale} opacity={haloOpacity} />

            {/* La SEULE source clé de la scène. Position == lune visible →
                la "traînée" sur l'asphalte mouillé est alignée avec le reflet
                de la lune dans la cubemap. Shadow camera dimensionnée pour la
                distance moon→origin (~178u) avec marge. */}
            <directionalLight
                position={moonPos}
                intensity={lightIntensity}
                color={lightColor}
                castShadow={castShadow}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-near={100}
                shadow-camera-far={260}
                shadow-camera-left={-30}
                shadow-camera-right={30}
                shadow-camera-top={30}
                shadow-camera-bottom={-30}
                shadow-bias={-0.0005}
            />

            {/* Capture une cubemap des children chaque frame → devient
                l'envMap implicite de tous les Standard/Reflector materials.
                256² suffit : l'asphalte mouillé floute toujours. */}
            <Environment frames={Infinity} resolution={reflectionResolution}>
                <ReflectionSky
                    moonPos={moonPos}
                    moonRadius={moonRadius}
                    moonIntensity={moonIntensity}
                    zenith={zenith}
                    horizon={horizon}
                />
            </Environment>
        </>
    );
}
