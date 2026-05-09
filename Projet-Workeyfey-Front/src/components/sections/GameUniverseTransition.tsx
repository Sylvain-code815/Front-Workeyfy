import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, DepthOfField, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { SpotLight, useTexture, OrbitControls, useGLTF, Environment, MeshReflectorMaterial } from '@react-three/drei';
import { useControls } from 'leva';
import * as THREE from 'three';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { useCanvasFrameloop } from '../../hooks/useCanvasFrameloop';
import diffuseUrl from '../../assets/faux_fur_geometric_1k/faux_fur_geometric_diff_1k.jpg';
import normalUrl from '../../assets/faux_fur_geometric_1k/faux_fur_geometric_nor_gl_1k.jpg';
import roughUrl from '../../assets/faux_fur_geometric_1k/faux_fur_geometric_rough_1k.jpg';
import './GameUniverseTransition.css';

gsap.registerPlugin(ScrollTrigger);

type ProgressRef = { current: { value: number } };

const FUSION_END = 0.22;
const FLASH_PEAK = 0.28;
const EXPLOSION_END = 0.42;
const GAME_START = 0.45;

const NODE_ACCENT = '#00E5FF';
const FLASH_COLOR = '#ffffff';
const SPARK_COLOR = '#7ff7ff';
const CYAN = '#00E5FF';
const MAGENTA = '#ff2a8a';

function FusionNodes({ progressRef }: { progressRef: ProgressRef }) {
    const groupRef = useRef<THREE.Group>(null);
    const startPositions = useMemo(() => {
        const N = 36;
        const arr: THREE.Vector3[] = [];
        for (let i = 0; i < N; i++) {
            arr.push(new THREE.Vector3(
                (Math.random() - 0.5) * 7,
                (Math.random() - 0.5) * 4.5,
                (Math.random() - 0.5) * 5 - 1.5,
            ));
        }
        return arr;
    }, []);

    useFrame(() => {
        if (!groupRef.current) return;
        const p = progressRef.current.value;
        const fusionT = THREE.MathUtils.smoothstep(p, 0, FUSION_END);
        const accel = Math.pow(fusionT, 2.4);
        groupRef.current.children.forEach((child, i) => {
            const s = startPositions[i];
            child.position.x = THREE.MathUtils.lerp(s.x, 0, accel);
            child.position.y = THREE.MathUtils.lerp(s.y, 0, accel);
            child.position.z = THREE.MathUtils.lerp(s.z, 0, accel);
            const scale = THREE.MathUtils.lerp(1, 0.05, accel);
            child.scale.setScalar(scale);
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshBasicMaterial;
            const fadeOut = THREE.MathUtils.smoothstep(p, FUSION_END - 0.04, FUSION_END + 0.02);
            mat.opacity = 1 - fadeOut;
        });
    });

    return (
        <group ref={groupRef}>
            {startPositions.map((pos, i) => (
                <mesh key={i} position={pos}>
                    <sphereGeometry args={[0.07, 12, 12]} />
                    <meshBasicMaterial
                        color={NODE_ACCENT}
                        transparent
                        toneMapped={false}
                    />
                </mesh>
            ))}
        </group>
    );
}

function CoreFlash({ progressRef }: { progressRef: ProgressRef }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);

    useFrame(() => {
        if (!meshRef.current || !matRef.current) return;
        const p = progressRef.current.value;
        const ramp = THREE.MathUtils.smoothstep(p, FUSION_END - 0.06, FLASH_PEAK);
        const fall = THREE.MathUtils.smoothstep(p, FLASH_PEAK, EXPLOSION_END);
        const intensity = ramp * (1 - fall);
        matRef.current.opacity = intensity;
        const scale = 0.05 + intensity * 1.4;
        meshRef.current.scale.setScalar(scale);
    });

    return (
        <mesh ref={meshRef} position={[0, 0, 0]}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial
                ref={matRef}
                color={FLASH_COLOR}
                transparent
                opacity={0}
                toneMapped={false}
            />
        </mesh>
    );
}

function ParticleBurst({ progressRef, count = 200 }: { progressRef: ProgressRef; count?: number }) {
    const pointsRef = useRef<THREE.Points>(null);
    const matRef = useRef<THREE.PointsMaterial>(null);

    const directions = useMemo(() => {
        const dirs = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const v = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5,
            )
                .normalize()
                .multiplyScalar(0.6 + Math.random() * 0.6);
            dirs[i * 3] = v.x;
            dirs[i * 3 + 1] = v.y;
            dirs[i * 3 + 2] = v.z;
        }
        return dirs;
    }, [count]);

    const geometry = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return geo;
    }, [count]);

    useFrame(() => {
        if (!pointsRef.current || !matRef.current) return;
        const p = progressRef.current.value;
        const expT = THREE.MathUtils.clamp(
            (p - FLASH_PEAK) / (EXPLOSION_END - FLASH_PEAK),
            0,
            1,
        );
        const positions = geometry.attributes.position.array as Float32Array;
        const distance = Math.pow(expT, 0.6) * 14;
        for (let i = 0; i < count; i++) {
            positions[i * 3] = directions[i * 3] * distance;
            positions[i * 3 + 1] = directions[i * 3 + 1] * distance;
            positions[i * 3 + 2] = directions[i * 3 + 2] * distance;
        }
        geometry.attributes.position.needsUpdate = true;
        const fadeIn = THREE.MathUtils.smoothstep(expT, 0, 0.1);
        const fadeOut = THREE.MathUtils.smoothstep(expT, 0.55, 1);
        matRef.current.opacity = fadeIn * (1 - fadeOut);
    });

    return (
        <points ref={pointsRef} geometry={geometry}>
            <pointsMaterial
                ref={matRef}
                color={SPARK_COLOR}
                size={0.09}
                sizeAttenuation
                transparent
                opacity={0}
                toneMapped={false}
                depthWrite={false}
            />
        </points>
    );
}

type Building = {
    pos: [number, number, number];
    size: [number, number, number];
    rotY?: number;
};

function CityCables({ buildings }: { buildings: Building[] }) {
    // Mêmes textures faux_fur_geometric que les câbles de la scène 1.
    const cableTextures = useTexture({
        diffuse: diffuseUrl,
        normal: normalUrl,
        rough: roughUrl,
    });

    // Data pulses : texture procédurale 4×64 avec deux bandes brillantes
    // étroites. Tilée 6× le long du tube + scroll rapide → impulsions qui
    // filent dans le câble comme du flux d'information.
    const pulseTexture = useMemo(() => {
        const w = 4, h = 64;
        const data = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) {
            const v = y / h;
            const band = Math.max(
                Math.exp(-Math.pow((v - 0.18) * 14, 2)),
                Math.exp(-Math.pow((v - 0.55) * 22, 2)) * 0.55,
            );
            const value = Math.floor(Math.min(1, band) * 255);
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                data[i] = value;
                data[i + 1] = value;
                data[i + 2] = value;
                data[i + 3] = 255;
            }
        }
        const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 6);
        tex.minFilter = THREE.LinearMipMapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        tex.needsUpdate = true;
        return tex;
    }, []);

    useEffect(() => {
        const list = [
            cableTextures.diffuse,
            cableTextures.normal,
            cableTextures.rough,
        ];
        list.forEach((tex) => {
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(50, 1);
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
            // Relief discret : suggéré, pas criard. Plus de pixel crawl.
            normalScale: new THREE.Vector2(0.5, 0.5),
            roughnessMap: cableTextures.rough,
            // Roughness 0.8 : tue les reflets nets et le scintillement.
            // On veut de la texture, pas des étincelles.
            roughness: 0.8,
            metalness: 0.6,
            emissive: new THREE.Color(CYAN),
            // emissiveMap dédié aux data pulses → indépendant du diffuse,
            // scroll rapide. Le diffuse continue à habiller les câbles.
            emissiveMap: pulseTexture,
            emissiveIntensity: 1.4,
            toneMapped: false,
        });
        mat.color.set('#00E5FF');
        return mat;
    }, [cableTextures, pulseTexture]);

    const curves = useMemo(() => {
        const result: THREE.CatmullRomCurve3[] = [];
        let s = 71;
        const rand = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };

        // Side spines along the curbs (left & right of road, x = ±3.5)
        const makeSpine = (x: number) => {
            const pts: THREE.Vector3[] = [];
            for (let z = 4; z >= -44; z -= 2.5) {
                pts.push(
                    new THREE.Vector3(
                        x + (rand() - 0.5) * 0.18,
                        0.04 + (rand() - 0.5) * 0.02,
                        z,
                    ),
                );
            }
            return new THREE.CatmullRomCurve3(pts);
        };
        const leftSpine = makeSpine(-3.5);
        const rightSpine = makeSpine(3.5);
        result.push(leftSpine, rightSpine);

        // Branch cables: from curb spine up each building facade
        buildings.forEach((b, i) => {
            const sideSign = b.pos[0] > 0 ? 1 : -1;
            const curbX = sideSign * 3.5;
            const z = b.pos[2];
            // Demi-largeur monde-X selon la rotation Y appliquée au bâtiment :
            // après une rotation de ±π/2, c'est size[2] (profondeur locale) qui
            // devient l'extension le long de X, pas size[0].
            const rotY = b.rotY ?? 0;
            const halfWorldX =
                Math.abs(Math.cos(rotY)) * (b.size[0] / 2) +
                Math.abs(Math.sin(rotY)) * (b.size[2] / 2);
            // Façade face vers la rue. plungeX est légèrement à l'intérieur du
            // mur → le câble pénètre la façade au lieu de mourir à 2 cm de
            // distance (effet "spaghetti qui flotte").
            const facadeX = b.pos[0] - sideSign * (halfWorldX + 0.02);
            const plungeX = facadeX + sideSign * 0.18;
            const facadeTopY = Math.min(b.size[1] - 0.4, 1.2 + (i % 5) * 0.7);
            const climbY = facadeTopY * 0.55;

            // Sag prononcé : le câble pèse, on descend presque au ras du sol
            // au milieu de la portée curb→façade. Petite asymétrie en Z pour
            // que le câble paraisse "vivant".
            const start = new THREE.Vector3(curbX, 0.06, z + 0.1);
            const sagDeep = new THREE.Vector3(
                curbX * 0.65 + facadeX * 0.35,
                0.05,
                z + 0.04,
            );
            const sagRise = new THREE.Vector3(
                curbX * 0.25 + facadeX * 0.75,
                0.32,
                z - 0.05,
            );
            // wallBase plonge à l'intérieur de la façade → connexion physique.
            const wallBase = new THREE.Vector3(plungeX, 0.5, z);
            const wallMid = new THREE.Vector3(facadeX, climbY, z);
            const wallTop = new THREE.Vector3(facadeX, facadeTopY, z);
            result.push(
                new THREE.CatmullRomCurve3([start, sagDeep, sagRise, wallBase, wallMid, wallTop]),
            );
        });

        // Cross cables (suspended above the street, connecting opposite facades)
        for (let i = 0; i < buildings.length; i += 4) {
            const b = buildings[i];
            if (!b) continue;
            const z = b.pos[2];
            const high = 3.2 + (i % 3) * 0.4;
            const left = new THREE.Vector3(-3.3, 1.4, z);
            const archA = new THREE.Vector3(-1.2, high, z + 0.15);
            const archB = new THREE.Vector3(1.2, high, z - 0.15);
            const right = new THREE.Vector3(3.3, 1.4, z);
            result.push(new THREE.CatmullRomCurve3([left, archA, archB, right]));
        }

        return result;
    }, [buildings]);

    // Boîtes de dérivation : petits boîtiers émissifs aux extrémités des
    // câbles de branche → suggère que les câbles sont VRAIMENT branchés sur
    // quelque chose, plus de "spaghetti dans le vide". Une au pied du
    // trottoir, une au bas de la façade côté rue.
    const junctionBoxes = useMemo(() => {
        return buildings.map((b) => {
            const sideSign = b.pos[0] > 0 ? 1 : -1;
            const curbX = sideSign * 3.5;
            const z = b.pos[2];
            const rotY = b.rotY ?? 0;
            const halfWorldX =
                Math.abs(Math.cos(rotY)) * (b.size[0] / 2) +
                Math.abs(Math.sin(rotY)) * (b.size[2] / 2);
            const facadeX = b.pos[0] - sideSign * (halfWorldX + 0.02);
            return {
                curb: [curbX, 0.08, z + 0.1] as [number, number, number],
                facade: [facadeX - sideSign * 0.04, 0.5, z] as [number, number, number],
            };
        });
    }, [buildings]);

    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        // Diffuse / normal / rough : scroll lent, donne de la matière au tube.
        const offsetSlow = -t * 0.06;
        if (material.map) material.map.offset.y = offsetSlow;
        if (material.normalMap) material.normalMap.offset.y = offsetSlow;
        if (material.roughnessMap) material.roughnessMap.offset.y = offsetSlow;
        // Pulse texture : scroll rapide pour faire courir les bandes brillantes
        // dans le sens du câble, comme un flux de données.
        if (material.emissiveMap) material.emissiveMap.offset.y = -t * 0.55;
        // Légère respiration globale pour ne pas figer l'intensité.
        material.emissiveIntensity = 1.3 + 0.2 * Math.sin(t * 1.4);
    });

    return (
        <group>
            {curves.map((curve, i) => (
                <mesh key={i} material={material}>
                    {/* 128 tubulaires + 12 radiaux : tube bien rond, courbes
                        lisses, normal map déployée proprement. */}
                    <tubeGeometry args={[curve, 128, 0.04, 12, false]} />
                </mesh>
            ))}
            {junctionBoxes.map((jb, i) => (
                <group key={`jb-${i}`}>
                    {/* Boîtier au pied du trottoir : noir mat avec liseré
                        cyan émissif → grippe les câbles à la rue. */}
                    <mesh position={jb.curb}>
                        <boxGeometry args={[0.18, 0.14, 0.14]} />
                        <meshStandardMaterial
                            color="#0a0d12"
                            roughness={0.45}
                            metalness={0.7}
                            emissive={CYAN}
                            emissiveIntensity={0.5}
                            toneMapped={false}
                        />
                    </mesh>
                    {/* Port de connexion sur la façade (un peu plus petit). */}
                    <mesh position={jb.facade}>
                        <boxGeometry args={[0.14, 0.18, 0.12]} />
                        <meshStandardMaterial
                            color="#0a0d12"
                            roughness={0.45}
                            metalness={0.7}
                            emissive={i % 2 === 0 ? CYAN : MAGENTA}
                            emissiveIntensity={0.6}
                            toneMapped={false}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

// Roughness map procédurale pour l'asphalte mouillé : flaques sombres (faible
// roughness → reflet net) sur fond rugueux (asphalte sec). Sans cette carte,
// la route est un miroir uniforme — kitsch. Avec, les reflets se brisent en
// plaques irrégulières → look cyberpunk Awwwards.
function useWetRoadRoughnessMap() {
    return useMemo(() => {
        const size = 256;
        const data = new Uint8Array(size * size);
        let s = 1337;
        const rand = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const u = x / size;
                const v = y / size;
                // Plusieurs sinusoïdes basse fréquence → blobs de flaques.
                let n =
                    Math.sin(u * 6.0 + v * 3.7) * 0.35 +
                    Math.sin(u * 13.0 - v * 9.0 + 1.7) * 0.22 +
                    Math.sin(u * 27.0 + v * 19.0 + 4.3) * 0.13;
                // Grain fin pour l'asphalte (pas un miroir uniforme).
                n += (rand() - 0.5) * 0.35;
                // Centré autour de 0.7 (asphalte rugueux dominant), descend
                // vers 0 sur les blobs (flaques très lisses → reflets nets).
                const v01 = Math.max(0, Math.min(1, 0.7 + n));
                data[y * size + x] = Math.floor(v01 * 255);
            }
        }
        const tex = new THREE.DataTexture(data, size, size, THREE.RedFormat);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 6);
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        return tex;
    }, []);
}

const BUILDING_URL = encodeURI('/cyberpunk v2.glb');
// Empreinte au sol cible (max(largeur, profondeur) en unités monde).
// Ramène n'importe quel GLB à une taille cohérente avec la rue (7 unités
// de large) et le reste de la scène, sans avoir à toucher au scale du modèle.
const TARGET_PLAN_SIZE = 4;

function useBuildingFit(scene: THREE.Object3D) {
    return useMemo(() => {
        const bbox = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bbox.getSize(size);
        bbox.getCenter(center);
        const planMax = Math.max(size.x, size.z);
        const fit = planMax > 0 ? TARGET_PLAN_SIZE / planMax : 1;
        return {
            fit,
            rawCenter: center.clone(),
            rawMinY: bbox.min.y,
            visualSize: [size.x * fit, size.y * fit, size.z * fit] as [number, number, number],
        };
    }, [scene]);
}

function CityBuildings({ buildings }: { buildings: Building[] }) {
    const gltf = useGLTF(BUILDING_URL);
    const { fit, rawCenter, rawMinY } = useBuildingFit(gltf.scene);

    // Néons "OPEN" et enseignes du building : intensité 3 + toneMapped off
    // pour que les couleurs saturées sortent du tone mapping ACES et pètent
    // au-dessus du seuil de Bloom (luminanceThreshold=0.6).
    type EmissiveLike = THREE.Material & {
        emissive?: THREE.Color;
        emissiveMap?: THREE.Texture | null;
        emissiveIntensity?: number;
        toneMapped?: boolean;
        userData: { baseEmissive?: number };
    };
    type StandardLike = THREE.Material & {
        envMapIntensity?: number;
        metalness?: number;
        roughness?: number;
    };
    // Liste des matériaux émissifs pour le flicker. Les matériaux sont
    // partagés entre les clones (Object3D.clone() ne clone pas les materials)
    // → un flicker affecte simultanément tous les bâtiments, ce qui se lit
    // comme une "ondulation néon" cohérente sur la rue.
    const emissiveMatsRef = useRef<EmissiveLike[]>([]);
    useEffect(() => {
        const collected: EmissiveLike[] = [];
        gltf.scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh || !mesh.material) return;
            const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const mat of list) {
                const m = mat as EmissiveLike;
                // Booste les reflets spéculaires sur tous les matériaux du
                // building : envMapIntensity 1.6 → le métal/verre accroche
                // vraiment l'environnement "night", on sort du look plastique.
                const std = m as StandardLike;
                if (std.envMapIntensity !== undefined) {
                    std.envMapIntensity = 1.6;
                }
                const hasEmissiveColor = !!m.emissive && (m.emissive.r > 0 || m.emissive.g > 0 || m.emissive.b > 0);
                const hasEmissiveMap = !!m.emissiveMap;
                if (!hasEmissiveColor && !hasEmissiveMap) {
                    m.needsUpdate = true;
                    continue;
                }
                if (m.emissiveIntensity !== undefined) m.emissiveIntensity = 3;
                if (m.toneMapped !== undefined) m.toneMapped = false;
                m.userData.baseEmissive = 3;
                m.needsUpdate = true;
                if (!collected.includes(m)) collected.push(m);
            }
        });
        emissiveMatsRef.current = collected;
    }, [gltf.scene]);

    // Flicker : à intervalles aléatoires (~ toutes les 4-10s), une enseigne
    // grésille pendant 150-350ms (alternance rapide à 30Hz). Le reste du
    // temps tout est stable → c'est la rareté qui rend l'effet crédible.
    const flickerRef = useRef<{ matIdx: number; until: number; phase: number }>({
        matIdx: -1,
        until: -1,
        phase: 0,
    });
    useFrame((_, dt) => {
        const list = emissiveMatsRef.current;
        if (list.length === 0) return;
        const f = flickerRef.current;
        f.phase += dt;
        if (f.matIdx < 0) {
            // Probabilité ~0.15/s → un flicker toutes les ~6.5s en moyenne.
            if (Math.random() < dt * 0.15) {
                f.matIdx = Math.floor(Math.random() * list.length);
                f.until = f.phase + 0.15 + Math.random() * 0.2;
            }
        } else {
            const m = list[f.matIdx];
            const base = m.userData.baseEmissive ?? 3;
            if (f.phase > f.until) {
                m.emissiveIntensity = base;
                f.matIdx = -1;
            } else {
                // Carré 30Hz → grésillement net, pas une rampe
                const on = Math.floor(f.phase * 30) % 2 === 0;
                m.emissiveIntensity = on ? base : base * 0.12;
            }
        }
    });

    // Un clone par instance : geometries/materials restent partagés (pas de
    // coût GPU supplémentaire), seuls les Object3D sont dupliqués.
    const clones = useMemo(
        () => buildings.map(() => gltf.scene.clone(true)),
        [buildings, gltf.scene],
    );

    return (
        <>
            {buildings.map((b, i) => (
                <group
                    key={i}
                    position={b.pos}
                    rotation={[0, b.rotY ?? 0, 0]}
                    scale={fit}
                >
                    <primitive
                        object={clones[i]}
                        position={[-rawCenter.x, -rawMinY, -rawCenter.z]}
                    />
                </group>
            ))}
        </>
    );
}

function GameCity({ progressRef }: { progressRef: ProgressRef }) {
    const groupRef = useRef<THREE.Group>(null);
    const wetRoughnessMap = useWetRoadRoughnessMap();

    const { showVolumes } = useControls('GameCity debug', {
        showVolumes: false,
    });

    // Chargement du GLB ici (cache drei) pour que le layout connaisse les
    // dimensions réelles du modèle après fit et que les câbles atterrissent
    // pile sur les façades.
    const gltf = useGLTF(BUILDING_URL);
    const { visualSize } = useBuildingFit(gltf.scene);

    // Deux immeubles face à face le long de la rue à Z=-10, reculés à X=±9
    // pour laisser la chaussée dégagée. Le bâtiment de gauche est tourné de
    // 180° par rapport à celui de droite (rotY: 0 vs π) → façades opposées.
    const buildings = useMemo<Building[]>(() => [
        { pos: [9, 0, -10], size: visualSize, rotY: Math.PI },
        { pos: [-9, 0, -10], size: visualSize, rotY: 0 },
    ], [visualSize]);

    useFrame(() => {
        if (!groupRef.current) return;
        const p = progressRef.current.value;
        const reveal = THREE.MathUtils.smoothstep(p, GAME_START, GAME_START + 0.18);
        groupRef.current.visible = reveal > 0.01;
        groupRef.current.children.forEach((child) => {
            child.scale.setScalar(THREE.MathUtils.lerp(0.4, 1, reveal));
        });
    });

    return (
        <group ref={groupRef}>
            {/* Ambiance cinéma : key directional discrète + hemisphere très
                basse. Toute la structure est dessinée par les emissive du
                building et les pointLights cyan/magenta de la rue. */}
            <directionalLight
                position={[8, 18, 6]}
                intensity={showVolumes ? 0.5 : 0.05}
                color="#5a78b8"
            />
            <hemisphereLight
                args={['#1a2840', '#040608', 0.15]}
            />

            {/* Cyan volumetric god ray — moody fog, plus blinding laser. */}
            <SpotLight
                position={[-7, 14, -10]}
                target-position={[-1, 2, -16]}
                color={CYAN}
                intensity={12}
                angle={0.42}
                penumbra={0.55}
                distance={42}
                attenuation={6}
                anglePower={5}
                opacity={0.15}
                radiusTop={0.12}
                radiusBottom={1.4}
                volumetric
            />

            {/* Magenta volumetric god ray — fog discret. */}
            <SpotLight
                position={[7, 13, -22]}
                target-position={[1, 1.5, -28]}
                color={MAGENTA}
                intensity={8}
                angle={0.4}
                penumbra={0.6}
                distance={42}
                attenuation={6}
                anglePower={5}
                opacity={0.12}
                radiusTop={0.12}
                radiusBottom={1.4}
                volumetric
            />

            {/* Cyan accent corridor — souffle d'ambiance, presque imperceptible. */}
            <SpotLight
                position={[0, 9, -34]}
                target-position={[0, 0.3, -8]}
                color={CYAN}
                intensity={5}
                angle={0.32}
                penumbra={0.7}
                distance={44}
                attenuation={6}
                anglePower={5}
                opacity={0.08}
                radiusTop={0.06}
                radiusBottom={0.6}
                volumetric
            />

            {/* Streetlights cyan/magenta — un par façade, alternés, posés
                à hauteur d'enseigne (y=2) à l'aplomb des immeubles. C'est
                eux qui dessinent la structure : ils peignent les façades
                pendant que les emissive du GLB donnent les enseignes. */}
            <pointLight position={[-2.8, 2, -10]} color={CYAN} intensity={14} distance={14} decay={2} />
            <pointLight position={[2.8, 2, -10]} color={MAGENTA} intensity={11} distance={14} decay={2} />
            <pointLight position={[2.8, 2, -22]} color={CYAN} intensity={14} distance={14} decay={2} />
            <pointLight position={[-2.8, 2, -22]} color={MAGENTA} intensity={11} distance={14} decay={2} />
            <pointLight position={[-2.8, 2, -34]} color={CYAN} intensity={14} distance={14} decay={2} />
            <pointLight position={[2.8, 2, -34]} color={MAGENTA} intensity={11} distance={14} decay={2} />

            {/* Streetlights basses (texture revealers) : hotspots cyan au
                niveau du sol pour faire chanter les tresses des câbles. */}
            <pointLight position={[-2.8, 0.4, -16]} color={CYAN} intensity={6} distance={8} decay={2} />
            <pointLight position={[2.8, 0.4, -28]} color={MAGENTA} intensity={5} distance={8} decay={2} />

            <CityBuildings buildings={buildings} />

            {/* Wet asphalt road : MeshReflectorMaterial → vraies réflexions
                planaires de la géométrie environnante (façades émissives,
                enseignes néon). Le roughnessMap procédural casse les reflets
                en flaques (zones sombres = miroir, zones claires = brouillé)
                pour éviter l'effet "patinoire uniforme". */}
            <mesh position={[0, 0.001, -18]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[7, 50]} />
                <MeshReflectorMaterial
                    resolution={512}
                    mirror={0.85}
                    blur={[300, 80]}
                    mixBlur={1.0}
                    mixStrength={2.4}
                    mixContrast={1.1}
                    color="#04080c"
                    metalness={0.9}
                    roughness={0.35}
                    roughnessMap={wetRoughnessMap}
                    depthScale={0.4}
                    minDepthThreshold={0.6}
                    maxDepthThreshold={1.4}
                />
            </mesh>

            {/* Glowing center line — emissive doux pour ne pas cramer. */}
            <mesh position={[0, 0.011, -18]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.14, 50]} />
                <meshStandardMaterial
                    color="#04080c"
                    emissive={CYAN}
                    emissiveIntensity={0.4}
                    roughness={0.6}
                    metalness={0.2}
                    toneMapped={false}
                />
            </mesh>

            {/* Side curb glow strips — même traitement, lueur calme. */}
            <mesh position={[-3.32, 0.011, -18]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.06, 50]} />
                <meshStandardMaterial
                    color="#04080c"
                    emissive={CYAN}
                    emissiveIntensity={0.4}
                    roughness={0.6}
                    metalness={0.2}
                    toneMapped={false}
                />
            </mesh>
            <mesh position={[3.32, 0.011, -18]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.06, 50]} />
                <meshStandardMaterial
                    color="#04080c"
                    emissive={CYAN}
                    emissiveIntensity={0.4}
                    roughness={0.6}
                    metalness={0.2}
                    toneMapped={false}
                />
            </mesh>

            <CityCables buildings={buildings} />
        </group>
    );
}

function Scene({ progressRef }: { progressRef: ProgressRef }) {
    return (
        <>
            <color attach="background" args={['#02050a']} />
            {/* Brouillard épais : la rue se perd dans le néant après 18m. */}
            <fog attach="fog" args={['#040a14', 5, 18]} />
            {/* Environment "night" : on monte à 0.7 pour que le métal/verre
                du building accroche vraiment des reflets spéculaires sur les
                arrêtes — sans ça le bâtiment paraît "plastique mat". L'ambient
                reste très bas (0.08) pour préserver les noirs profonds. */}
            <Environment preset="night" environmentIntensity={0.7} />
            <ambientLight intensity={0.08} />
            {/* Caméra libre : OrbitControls pour inspecter les câbles. */}
            <OrbitControls
                makeDefault
                enableDamping
                dampingFactor={0.06}
                enablePan
                enableZoom
                enableRotate
                target={[0, 1.5, -10]}
                minDistance={1}
                maxDistance={60}
            />
            <FusionNodes progressRef={progressRef} />
            <CoreFlash progressRef={progressRef} />
            <ParticleBurst progressRef={progressRef} />
            <GameCity progressRef={progressRef} />

            <EffectComposer multisampling={0} enableNormalPass={false}>
                {/* Bloom calibré "Cinéma Noir" : seuls les pixels très brillants
                    (fenêtres immeubles, HUD) bavent. Les câbles à emissive 0.05
                    restent SOUS le seuil → tressage net sans halo. */}
                <Bloom
                    intensity={0.85}
                    luminanceThreshold={0.6}
                    luminanceSmoothing={0.85}
                    mipmapBlur
                    height={300}
                />
                {/* Depth of Field en unités monde : focus pile sur le bâtiment
                    (~15u devant la caméra), zone de netteté étroite (4u) →
                    le câble qui frôle au premier plan flou, fond de rue qui
                    se perd. C'est ce qui fait basculer l'image en "cinéma". */}
                <DepthOfField
                    worldFocusDistance={15}
                    worldFocusRange={4}
                    bokehScale={5}
                    height={480}
                />
                {/* Vignette : assombrissement périphérique → focus naturel
                    sur le centre, renforce la profondeur cinéma. */}
                <Vignette
                    darkness={0.55}
                    offset={0.32}
                    blendFunction={BlendFunction.NORMAL}
                />
                {/* Grain pellicule : casse les aplats numériques. Très discret
                    (4%) en SOFT_LIGHT pour ne pas grésiller les noirs. */}
                <Noise
                    premultiply
                    opacity={0.04}
                    blendFunction={BlendFunction.SOFT_LIGHT}
                />
            </EffectComposer>
        </>
    );
}

export default function GameUniverseTransition() {
    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const techListRef = useRef<HTMLUListElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const hudRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<{ value: number }>({ value: 0 });
    const frameloop = useCanvasFrameloop(sectionRef);

    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ paused: true });

            tl.to(
                progressRef.current,
                {
                    value: 1,
                    duration: 10,
                    ease: 'none',
                },
                0,
            );

            tl.fromTo(
                hudRef.current,
                { opacity: 0 },
                {
                    opacity: 1,
                    duration: 0.9,
                    ease: 'power2.out',
                },
                5.5,
            );

            tl.fromTo(
                overlayRef.current,
                { opacity: 0 },
                {
                    opacity: 1,
                    duration: 0.9,
                    ease: 'power2.out',
                },
                6.0,
            );

            tl.fromTo(
                titleRef.current,
                { opacity: 0, y: 30 },
                {
                    opacity: 0.87,
                    y: 0,
                    duration: 1.1,
                    ease: 'power2.out',
                },
                6.1,
            );

            tl.fromTo(
                techListRef.current,
                { opacity: 0, y: 20 },
                {
                    opacity: 0.6,
                    y: 0,
                    duration: 1.1,
                    ease: 'power2.out',
                },
                6.9,
            );

            ScrollTrigger.create({
                trigger: el,
                start: 'top 80%',
                end: 'bottom 20%',
                animation: tl,
                toggleActions: 'play none none reverse',
            });
        }, el);
        return () => ctx.revert();
    }, []);

    // Parallax HUD au mouvement souris : chaque panneau a sa propre profondeur
    // (server proche, link plus loin, queue au premier plan) → vraie 3D
    // perçue entre l'écran et la scène. Smoothing rAF avec lerp 0.07 pour que
    // le mouvement traîne légèrement, jamais saccadé.
    useEffect(() => {
        const section = sectionRef.current;
        const hud = hudRef.current;
        const overlay = overlayRef.current;
        if (!section || !hud || !overlay) return;

        const panels = Array.from(
            hud.querySelectorAll<HTMLElement>('.GameUniverse-hud-panel'),
        );
        // Profondeurs en px : amplitude maximale du translate.
        const panelDepths = [9, 7, 11];
        const target = { x: 0, y: 0 };
        const current = { x: 0, y: 0 };
        let rafId = 0;

        const onMove = (e: MouseEvent) => {
            const rect = section.getBoundingClientRect();
            target.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            target.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        };
        const onLeave = () => {
            target.x = 0;
            target.y = 0;
        };

        // Micro-vibration "digital judder" : updated 12x/s, amplitude < 1px.
        // C'est l'âme tech qui manque au HUD — il vibre comme un vrai écran.
        const jitter = { x: 0, y: 0, last: 0 };
        const tick = () => {
            current.x += (target.x - current.x) * 0.07;
            current.y += (target.y - current.y) * 0.07;
            const now = performance.now();
            if (now - jitter.last > 80) {
                jitter.x = (Math.random() - 0.5) * 0.9;
                jitter.y = (Math.random() - 0.5) * 0.6;
                jitter.last = now;
            }
            panels.forEach((p, i) => {
                const d = panelDepths[i] ?? 6;
                p.style.transform = `translate3d(${current.x * d + jitter.x}px, ${current.y * d + jitter.y}px, 0)`;
            });
            // L'overlay garde son centrage X (translateX(-50%) hérité du CSS) :
            // on compose avec calc() pour ne pas le casser.
            overlay.style.transform = `translate3d(calc(-50% + ${current.x * 5 + jitter.x * 0.4}px), ${current.y * 4 + jitter.y * 0.4}px, 0)`;
            rafId = requestAnimationFrame(tick);
        };

        section.addEventListener('mousemove', onMove);
        section.addEventListener('mouseleave', onLeave);
        rafId = requestAnimationFrame(tick);
        return () => {
            section.removeEventListener('mousemove', onMove);
            section.removeEventListener('mouseleave', onLeave);
            cancelAnimationFrame(rafId);
            panels.forEach((p) => { p.style.transform = ''; });
            overlay.style.transform = '';
        };
    }, []);

    return (
        <section
            ref={sectionRef}
            className="GameUniverse"
            aria-label="Univers gaming — fusion et révélation"
        >
            <div className="GameUniverse-sticky">
                <Canvas
                    className="GameUniverse-canvas"
                    camera={{ position: [0, 0, 5], fov: 45 }}
                    gl={{ antialias: false, powerPreference: 'high-performance' }}
                    dpr={[1, 1]}
                    frameloop={frameloop}
                >
                    <Scene progressRef={progressRef} />
                </Canvas>

                <div ref={hudRef} className="GameUniverse-hud" aria-hidden="true">
                    <div className="GameUniverse-hud-panel GameUniverse-hud-server">
                        <div className="GameUniverse-hud-panel-head">
                            <span className="GameUniverse-hud-dot" />
                            <h4>Server Status</h4>
                        </div>
                        <ul className="GameUniverse-hud-kv">
                            <li>
                                <span className="GameUniverse-hud-key">FiveM Connection</span>
                                <span className="GameUniverse-hud-val GameUniverse-hud-val--ok">Stable</span>
                            </li>
                            <li>
                                <span className="GameUniverse-hud-key">Tickrate</span>
                                <span className="GameUniverse-hud-val">128 Hz</span>
                            </li>
                            <li>
                                <span className="GameUniverse-hud-key">Players</span>
                                <span className="GameUniverse-hud-val">128 / 256</span>
                            </li>
                            <li>
                                <span className="GameUniverse-hud-key">Build</span>
                                <span className="GameUniverse-hud-val">workify-fivem · v3.4.1</span>
                            </li>
                        </ul>
                    </div>

                    <div className="GameUniverse-hud-panel GameUniverse-hud-link">
                        <div className="GameUniverse-hud-panel-head">
                            <span className="GameUniverse-hud-dot GameUniverse-hud-dot--magenta" />
                            <h4>Connection</h4>
                        </div>
                        <div className="GameUniverse-hud-metric">
                            <span className="GameUniverse-hud-key">Latency</span>
                            <span className="GameUniverse-hud-mono">12 ms</span>
                            <div className="GameUniverse-hud-bar"><span style={{ width: '14%' }} /></div>
                        </div>
                        <div className="GameUniverse-hud-metric">
                            <span className="GameUniverse-hud-key">Frame time</span>
                            <span className="GameUniverse-hud-mono">7.8 ms</span>
                            <div className="GameUniverse-hud-bar"><span style={{ width: '38%' }} /></div>
                        </div>
                        <div className="GameUniverse-hud-metric">
                            <span className="GameUniverse-hud-key">Packet loss</span>
                            <span className="GameUniverse-hud-mono">0.02 %</span>
                            <div className="GameUniverse-hud-bar GameUniverse-hud-bar--alt"><span style={{ width: '4%' }} /></div>
                        </div>
                    </div>

                    <div className="GameUniverse-hud-panel GameUniverse-hud-queue">
                        <div className="GameUniverse-hud-panel-head">
                            <span className="GameUniverse-hud-dot" />
                            <h4>Modding Queue</h4>
                            <span className="GameUniverse-hud-tag">/scripts</span>
                        </div>
                        <ul className="GameUniverse-hud-queue-list">
                            <li>
                                <span className="GameUniverse-hud-script">
                                    <span className="GameUniverse-hud-script-lang">lua</span>
                                    <span>core/inventory.lua</span>
                                </span>
                                <span className="GameUniverse-hud-status GameUniverse-hud-status--ok">running</span>
                            </li>
                            <li>
                                <span className="GameUniverse-hud-script">
                                    <span className="GameUniverse-hud-script-lang GameUniverse-hud-script-lang--ts">ts</span>
                                    <span>nui/hud.tsx</span>
                                </span>
                                <span className="GameUniverse-hud-status GameUniverse-hud-status--ok">running</span>
                            </li>
                            <li>
                                <span className="GameUniverse-hud-script">
                                    <span className="GameUniverse-hud-script-lang">lua</span>
                                    <span>esx_jobs/dispatch.lua</span>
                                </span>
                                <span className="GameUniverse-hud-status">build 84%</span>
                            </li>
                            <li>
                                <span className="GameUniverse-hud-script">
                                    <span className="GameUniverse-hud-script-lang GameUniverse-hud-script-lang--ts">ts</span>
                                    <span>shared/protocol.ts</span>
                                </span>
                                <span className="GameUniverse-hud-status GameUniverse-hud-status--queue">queued</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div ref={overlayRef} className="GameUniverse-overlay">
                    <span className="GameUniverse-overlay-eyebrow">// metaverse · build pipeline</span>
                    <h2 ref={titleRef} className="GameUniverse-title">
                        Metaverse Modding Framework
                    </h2>
                    <ul ref={techListRef} className="GameUniverse-tech">
                        <li>Lua</li>
                        <li>TypeScript</li>
                        <li>FiveM</li>
                        <li>NUI</li>
                    </ul>
                </div>
            </div>
        </section>
    );
}

useGLTF.preload(BUILDING_URL);
