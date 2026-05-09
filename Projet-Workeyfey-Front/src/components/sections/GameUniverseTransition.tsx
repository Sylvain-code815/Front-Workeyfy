import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, DepthOfField, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useTexture, useGLTF, Environment, MeshReflectorMaterial, PerspectiveCamera } from '@react-three/drei';
import { useControls } from 'leva';
import * as THREE from 'three';
import { HalfFloatType } from 'three';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { useCanvasFrameloop } from '../../hooks/useCanvasFrameloop';
import diffuseUrl from '../../assets/faux_fur_geometric_1k/faux_fur_geometric_diff_1k.jpg';
import normalUrl from '../../assets/faux_fur_geometric_1k/faux_fur_geometric_nor_gl_1k.jpg';
import roughUrl from '../../assets/faux_fur_geometric_1k/faux_fur_geometric_rough_1k.jpg';
import './GameUniverseTransition.css';

// Bleu nuit très profond — couleur unique pour le ciel, le fond Environment
// (cubemap = aplat → reflets neutres sombres) et le fog. Une seule source de
// vérité : zéro seam entre fond, brouillard et cubemap.
const NIGHT_BG = '#010409';

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

// Texture procédurale de silhouette urbaine pour le plan d'horizon : bâtiments
// dentelés (largeurs et hauteurs aléatoires) en sombre sur ciel quasi noir,
// avec quelques pixels brillants cyan/magenta pour les fenêtres lointaines.
// Utilisée en map ET emissiveMap → les fenêtres percent à travers le brouillard.
function useCityHorizonTexture() {
    return useMemo(() => {
        const w = 1024, h = 256;
        const data = new Uint8Array(w * h * 4);
        const emissiveData = new Uint8Array(w * h * 4);
        let s = 4242;
        const rand = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
        // Hauteurs par "blocs" de bâtiments contigus pour avoir une dentelure
        // crédible (bâtiments larges et étroits mélangés).
        const blockHeights: number[] = new Array(w);
        let i = 0;
        while (i < w) {
            const blockW = 8 + Math.floor(rand() * 38);
            const baseH = 0.18 + Math.pow(rand(), 1.6) * 0.55;
            for (let k = 0; k < blockW && i + k < w; k++) {
                // Petite variation à l'intérieur du bloc pour étages.
                blockHeights[i + k] = baseH + (rand() - 0.5) * 0.04;
            }
            i += blockW;
        }
        for (let y = 0; y < h; y++) {
            const v = 1 - y / h;
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                const bh = blockHeights[x] ?? 0.3;
                const inBuilding = v < bh;
                if (inBuilding) {
                    // Silhouette sombre. Légère variation par hauteur pour
                    // ne pas faire complètement opaque.
                    data[idx] = 4;
                    data[idx + 1] = 8;
                    data[idx + 2] = 16;
                    // Fenêtres clairsemées : 1.5% de chance d'être allumée.
                    if (rand() < 0.015) {
                        const cyan = rand() < 0.55;
                        const r = cyan ? 0 : 220;
                        const g = cyan ? 220 : 60;
                        const b = cyan ? 240 : 140;
                        emissiveData[idx] = r;
                        emissiveData[idx + 1] = g;
                        emissiveData[idx + 2] = b;
                    }
                } else {
                    // Ciel : transparent → laisse voir l'environnement derrière.
                    data[idx] = 2;
                    data[idx + 1] = 4;
                    data[idx + 2] = 10;
                }
                data[idx + 3] = inBuilding ? 255 : 0;
                emissiveData[idx + 3] = 255;
            }
        }
        const colorTex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
        colorTex.minFilter = THREE.LinearMipMapLinearFilter;
        colorTex.magFilter = THREE.LinearFilter;
        colorTex.generateMipmaps = true;
        colorTex.needsUpdate = true;
        const emissiveTex = new THREE.DataTexture(emissiveData, w, h, THREE.RGBAFormat);
        emissiveTex.minFilter = THREE.LinearMipMapLinearFilter;
        emissiveTex.magFilter = THREE.LinearFilter;
        emissiveTex.generateMipmaps = true;
        emissiveTex.needsUpdate = true;
        return { colorTex, emissiveTex };
    }, []);
}

// Normal map "asphalte granuleux" : micro-aspérités majoritairement
// isotropes + une trace résiduelle de stries longitudinales pour garder un
// peu du caractère "humide". Avec ce grain, le reflet de la lune n'est plus
// une ligne droite parfaite (look kitsch CG) — il scintille sur les
// aspérités du sol comme du vrai asphalte mouillé. L'anisotropy max=16
// conserve la netteté du grain au glancing angle.
function useRainNormalMap() {
    return useMemo(() => {
        const w = 384, h = 384;
        const data = new Uint8Array(w * h * 4);
        let s = 9001;
        const rand = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const u = x / w;
                const v = y / h;
                // Trace résiduelle de stries longitudinales (très atténuées
                // par rapport à l'ancienne version) — donne juste un soupçon
                // de "wet character" sans imposer une ligne de reflet.
                const ridge =
                    Math.sin(u * 28 + v * 2.0) * 0.10 +
                    Math.sin(u * 11 + v * 1.4 + 1.3) * 0.06;
                // Quelques gouttes rondes éparses pour la lecture matière.
                const drop =
                    Math.exp(-(((u - 0.27) * 14) ** 2 + ((v - 0.43) * 11) ** 2)) * 0.35 +
                    Math.exp(-(((u - 0.71) * 16) ** 2 + ((v - 0.78) * 13) ** 2)) * 0.30 +
                    Math.exp(-(((u - 0.43) * 20) ** 2 + ((v - 0.18) * 17) ** 2)) * 0.25;
                // GRAIN isotrope haute fréquence — le moteur principal du
                // scintillement. dx et dy reçoivent du grain INDÉPENDANT
                // (pas le même `noise` appliqué partout) → vraies aspérités
                // 3D, pas une vague qui ondule en bloc.
                const grainX = (rand() - 0.5) * 0.95;
                const grainY = (rand() - 0.5) * 0.95;
                const dx = ridge * 0.4 + drop * 0.3 + grainX;
                const dy = ridge * 0.25 + drop * 0.3 + grainY;
                const len = Math.sqrt(dx * dx + dy * dy + 1);
                const nx = dx / len, ny = dy / len, nz = 1 / len;
                const idx = (y * w + x) * 4;
                data[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
                data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
                data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
                data[idx + 3] = 255;
            }
        }
        const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        // Tile dense ET isotrope (4×4 sur le plan) → grain serré qui se lit
        // partout sans se répéter visiblement.
        tex.repeat.set(4, 4);
        tex.minFilter = THREE.LinearMipMapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        tex.anisotropy = 16;
        tex.needsUpdate = true;
        return tex;
    }, []);
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
        tex.anisotropy = 16;
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
            // Active la projection d'ombres sous la lumière de la lune.
            mesh.castShadow = true;
            mesh.receiveShadow = true;
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
        () => buildings.map(() => {
            const clone = gltf.scene.clone(true);
            // Active castShadow / receiveShadow sur chaque mesh du clone
            // après création (l'instance source peut ne pas l'avoir au moment
            // du clone). Les bâtiments projettent maintenant leur ombre sur
            // la chaussée sous la lumière de la lune.
            clone.traverse((obj) => {
                const m = obj as THREE.Mesh;
                if (m.isMesh) {
                    m.castShadow = true;
                    m.receiveShadow = true;
                }
            });
            return clone;
        }),
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

// Ligne centrale de la route avec data pulses : bandes brillantes qui
// descendent la rue à différentes vitesses. Pulse l'intensité globale en plus
// du scroll pour donner une "vibration de transmission" plutôt qu'un flux lisse.
function CenterLineDataPulse() {
    const matRef = useRef<THREE.MeshStandardMaterial>(null);
    const pulseTexture = useMemo(() => {
        const w = 4, h = 256;
        const data = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) {
            const v = y / h;
            // Trois bandes brillantes étroites + un fond cyan continu très bas
            // pour que la ligne reste lisible quand aucune bande ne passe.
            const band =
                Math.exp(-Math.pow((v - 0.12) * 22, 2)) +
                Math.exp(-Math.pow((v - 0.43) * 28, 2)) * 0.7 +
                Math.exp(-Math.pow((v - 0.78) * 18, 2)) * 0.85;
            const base = 0.18;
            const value = Math.floor(Math.min(1, base + band) * 255);
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
        tex.repeat.set(1, 4);
        tex.minFilter = THREE.LinearMipMapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        tex.needsUpdate = true;
        return tex;
    }, []);

    useFrame(({ clock }) => {
        const m = matRef.current;
        if (!m || !m.emissiveMap) return;
        const t = clock.elapsedTime;
        m.emissiveMap.offset.y = -t * 0.65;
        // Vibration globale + flicker rare (3% du temps) pour casser le rythme.
        const flicker = Math.random() < 0.03 ? 0.4 : 1;
        m.emissiveIntensity = (1.4 + 0.25 * Math.sin(t * 3.2)) * flicker;
    });

    return (
        <mesh position={[0, 0.011, -18]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.14, 50]} />
            <meshStandardMaterial
                ref={matRef}
                color="#04080c"
                emissive={CYAN}
                emissiveMap={pulseTexture}
                emissiveIntensity={1.4}
                roughness={0.6}
                metalness={0.2}
                toneMapped={false}
            />
        </mesh>
    );
}

// Drone lamp : sphère émissive blanc-bleu suspendue avec une petite pointlight
// intégrée. Sert de remplissage chaleureux ponctuel dans la scène moonlight.
// Petite oscillation verticale pour qu'elle ait l'air de flotter en lévitation.
function DroneLamp({ position }: { position: [number, number, number] }) {
    const groupRef = useRef<THREE.Group>(null);
    const baseY = position[1];
    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const t = clock.elapsedTime;
        // Oscillation verticale sub-pixel pour vie sans distraction.
        groupRef.current.position.y = baseY + Math.sin(t * 0.9 + position[0] * 0.7) * 0.06;
    });
    return (
        <group ref={groupRef} position={position}>
            <mesh>
                <sphereGeometry args={[0.09, 16, 16]} />
                <meshBasicMaterial color="#dbeaff" toneMapped={false} />
            </mesh>
            {/* Halo doux autour du bulb */}
            <mesh>
                <sphereGeometry args={[0.18, 16, 16]} />
                <meshBasicMaterial
                    color="#b9d5ff"
                    transparent
                    opacity={0.25}
                    toneMapped={false}
                    depthWrite={false}
                />
            </mesh>
            <pointLight color="#b9d5ff" intensity={2.2} distance={7} decay={2} />
        </group>
    );
}

function GameCity({ progressRef }: { progressRef: ProgressRef }) {
    const groupRef = useRef<THREE.Group>(null);
    const wetRoughnessMap = useWetRoadRoughnessMap();
    const rainNormalMap = useRainNormalMap();

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
            {/* "Lune" — directionalLight unique et clé de la scène.
                Position [20,40,-50] : haut-droite-arrière des bâtiments →
                rim-light côté droit + ombres longues qui rampent vers la
                caméra sur la chaussée. C'est elle qui sculpte la traînée
                lumineuse sur l'asphalte mouillé. Intensity 3.5 + bleu glacé
                #d1e3ff = tone "moonlit night" cinéma. */}
            <directionalLight
                position={[20, 40, -50]}
                intensity={3.5}
                color="#d1e3ff"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-near={1}
                shadow-camera-far={140}
                shadow-camera-left={-25}
                shadow-camera-right={25}
                shadow-camera-top={25}
                shadow-camera-bottom={-25}
                shadow-bias={-0.0005}
            />

            {/* Hemisphere léger : un peu de bleu nuit qui tombe du ciel sur le
                dessus, gris très sombre par en dessous → empêche les zones
                non éclairées par la lune d'être noires absolues. */}
            <hemisphereLight
                args={['#5078b0', '#040608', 0.25]}
            />
            {/* showVolumes (leva) : on garde un boost dev pour inspecter. */}
            {showVolumes && (
                <directionalLight position={[8, 18, 6]} intensity={0.4} color="#b9d5ff" />
            )}



            <CityBuildings buildings={buildings} />


            {/* Route miroir lune avec rain normal map : les micro-stries en X
                local (perpendiculaire au sens de la rue) étirent le highlight
                de la lune en longue traînée verticale vers la caméra → le
                vrai look "wet asphalt" Mann/Blade Runner. */}
            <mesh
                position={[0, 0.001, -18]}
                rotation={[-Math.PI / 2, 0, 0]}
                receiveShadow
            >
                <planeGeometry args={[7, 50]} />
                <MeshReflectorMaterial
                    resolution={512}
                    mirror={0.9}
                    blur={[260, 60]}
                    mixBlur={0.85}
                    mixStrength={2.5}
                    mixContrast={1.1}
                    color="#04080c"
                    // metalness 0.7 + roughness 0.35 : on garde l'effet
                    // mouillé (reflectivité métallique) mais on tue le côté
                    // miroir parfait. L'asphalte n'est PAS du verre — il
                    // diffuse, il accroche la lumière en plaques.
                    metalness={0.7}
                    roughness={0.35}
                    roughnessMap={wetRoughnessMap}
                    // Grain isotrope (cf. useRainNormalMap) → reflet de lune
                    // brisé en scintillements au lieu d'une ligne droite.
                    // normalScale isotrope (0.45/0.45) : pas de favoritisme
                    // axial, le grain joue dans toutes les directions.
                    normalMap={rainNormalMap}
                    normalScale={new THREE.Vector2(0.45, 0.45)}
                    depthScale={0.4}
                    minDepthThreshold={0.6}
                    maxDepthThreshold={1.4}
                />
            </mesh>

            {/* Ligne centrale animée avec data pulses : bandes brillantes
                qui descendent la rue + flicker rare → flux d'information
                plutôt qu'un trait propre uniforme. */}
            <CenterLineDataPulse />

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

// Horizon : grand plan placé loin derrière les bâtiments avec un dégradé
// radial bleu-électrique → noir. Simule la lueur diffuse d'une mégapole
// lointaine (bandeau d'enseignes/lumières urbaines) sans modéliser le moindre
// bâtiment. UV plane = (0..1)², centre 0.5 → ellipse de glow proportionnée
// à l'aspect du plan (large et basse → glow horizontal de "skyline").
//
// Opacité pilotée par progressRef : reste à 0 (invisible) pendant les phases
// fusion/flash/explosion, fade-in sur la même courbe que la révélation des
// buildings (smoothstep p ∈ [GAME_START, GAME_START+0.18]) → on voit
// d'abord le noir, puis la ville et son ciel apparaissent ensemble.
function Horizon({ progressRef }: { progressRef: ProgressRef }) {
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                centerColor: { value: new THREE.Color('#0d3a8a') },
                edgeColor: { value: new THREE.Color('#000000') },
                falloff: { value: 1.6 },
                opacity: { value: 0 },
            },
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform vec3 centerColor;
                uniform vec3 edgeColor;
                uniform float falloff;
                uniform float opacity;
                varying vec2 vUv;
                void main() {
                    vec2 d = vUv - 0.5;
                    float r = clamp(length(d) * 2.0, 0.0, 1.0);
                    float t = pow(r, falloff);
                    gl_FragColor = vec4(mix(centerColor, edgeColor, t), opacity);
                }
            `,
            transparent: true,
            depthWrite: false,
            toneMapped: false,
        });
    }, []);

    useFrame(() => {
        const p = progressRef.current.value;
        const reveal = THREE.MathUtils.smoothstep(p, GAME_START, GAME_START + 0.18);
        material.uniforms.opacity.value = reveal;
    });

    return (
        // z=-100 : largement derrière les bâtiments (z=-10) et la fin de
        // route (z=-43). renderOrder bas pour passer derrière tout le reste
        // sans dépendre du depth test (depthWrite off de toute façon).
        <mesh material={material} position={[0, 4, -100]} renderOrder={-200}>
            <planeGeometry args={[260, 80]} />
        </mesh>
    );
}

// Anime la caméra : Y=0 pendant l'intro (la boule de fusion à l'origine
// reste donc parfaitement centrée à l'écran) → lerp vers la cible leva
// (Y~2.5) sur la fenêtre de reveal des bâtiments. L'angle "city" reste
// pilotable en live via leva, l'intro reste centrée sans toucher aux
// composants d'animation.
function CameraRig({
    progressRef,
    target,
}: {
    progressRef: ProgressRef;
    target: { posX: number; posY: number; posZ: number; fov: number };
}) {
    const { camera } = useThree();
    useFrame(() => {
        const p = progressRef.current.value;
        const reveal = THREE.MathUtils.smoothstep(p, GAME_START, GAME_START + 0.18);
        camera.position.x = target.posX;
        camera.position.y = THREE.MathUtils.lerp(0, target.posY, reveal);
        camera.position.z = target.posZ;
        const persp = camera as THREE.PerspectiveCamera;
        if (persp.isPerspectiveCamera && persp.fov !== target.fov) {
            persp.fov = target.fov;
            persp.updateProjectionMatrix();
        }
    });
    return null;
}

// Pilote scene.background et scene.fog : pur noir pendant les phases intro
// (fusion → flash → explosion), lerp vers NIGHT_BG sur la même fenêtre que
// la révélation des bâtiments. Pas un <color attach> statique : il faut un
// useFrame pour interpoler les couleurs en temps réel.
function BackgroundController({ progressRef }: { progressRef: ProgressRef }) {
    const { scene } = useThree();
    const black = useMemo(() => new THREE.Color('#000000'), []);
    const night = useMemo(() => new THREE.Color(NIGHT_BG), []);

    useEffect(() => {
        const bg = new THREE.Color('#000000');
        const fog = new THREE.Fog('#000000', 8, 45);
        const prevBg = scene.background;
        const prevFog = scene.fog;
        scene.background = bg;
        scene.fog = fog;
        return () => {
            scene.background = prevBg;
            scene.fog = prevFog;
        };
    }, [scene]);

    useFrame(() => {
        const p = progressRef.current.value;
        const reveal = THREE.MathUtils.smoothstep(p, GAME_START, GAME_START + 0.18);
        if (scene.background instanceof THREE.Color) {
            scene.background.lerpColors(black, night, reveal);
        }
        if (scene.fog instanceof THREE.Fog) {
            scene.fog.color.lerpColors(black, night, reveal);
        }
    });

    return null;
}

function Scene({ progressRef }: { progressRef: ProgressRef }) {
    // Petit panneau de tuning : ambient pour remonter les noirs si la lune
    // ne suffit pas. Le reste (couleur du fond, position lune, route) est
    // hardcodé selon la spec — pas de surface leva pour ce qui ne bouge pas.
    const sky = useControls('Sky (night premium)', {
        ambientIntensity: { value: 0.08, min: 0, max: 1, step: 0.01 },
    });
    // Caméra fixe (pas d'OrbitControls) mais paramétrable en live via leva.
    // Le prop `camera` du <Canvas> ne sert qu'au mount initial → pour ajuster
    // sans hard-reload il faut une vraie <PerspectiveCamera makeDefault>.
    const cam = useControls('Camera', {
        posX: { value: 0, min: -10, max: 10, step: 0.1 },
        posY: { value: 2.5, min: -2, max: 12, step: 0.1 },
        posZ: { value: 5, min: -2, max: 20, step: 0.1 },
        fov: { value: 45, min: 20, max: 90, step: 1 },
    });
    return (
        <>
            {/* Caméra par défaut : pose "intro" (Y=0) hardcodée pour que le
                premier frame cadre la boule de fusion centrée. Tout le reste
                (lerp vers Y leva pendant le reveal, fov réactif) est piloté
                par <CameraRig> en useFrame → réactif aux changements leva
                ET au progressRef sans flicker. */}
            <PerspectiveCamera
                makeDefault
                position={[0, 0, 5]}
                fov={45}
                near={0.1}
                far={1000}
            />
            <CameraRig progressRef={progressRef} target={cam} />
            {/* Background + fog noirs pendant la fusion/explosion, lerp vers
                NIGHT_BG dès que GameCity commence sa révélation. Pas de
                <color attach> statique : on a besoin d'un useFrame pour
                interpoler en temps réel sur le progressRef. */}
            <BackgroundController progressRef={progressRef} />
            {/* <Environment> sans preset : ses children sont rendus dans une
                cubemap qui devient l'envMap des Standard/Reflector materials.
                Ici juste un aplat bleu nuit → reflets neutres et sombres,
                pas de "ciel HDRI" qui imposerait sa propre ambiance.
                Pendant l'intro, GameCity est invisible donc aucun matériau
                ne consomme cette envMap → pas la peine de la gater. */}
            <Environment frames={1} resolution={64}>
                <color attach="background" args={[NIGHT_BG]} />
            </Environment>
            {/* Skyline glow : grand plan loin derrière les bâtiments,
                dégradé radial bleu électrique → noir. Opacité pilotée par
                progressRef → reste invisible pendant l'intro, fade-in avec
                la révélation des bâtiments. */}
            <Horizon progressRef={progressRef} />
            {/* Ambient pilotable : remonte les noirs si la lune ne suffit pas. */}
            <ambientLight intensity={sky.ambientIntensity} color="#b9d5ff" />
            {/* Caméra fixe — pas d'OrbitControls : l'utilisateur regarde la
                scène cadrée par défaut (camera.position [0,0,5], fov 45),
                la mise en scène contrôle ce qu'on voit. */}
            <FusionNodes progressRef={progressRef} />
            <CoreFlash progressRef={progressRef} />
            <ParticleBurst progressRef={progressRef} />
            <GameCity progressRef={progressRef} />

            {/* frameBufferType=HalfFloatType : pipeline 16-bit float pour que
                les valeurs HDR émissives (toneMapped:false, intensity > 1) ne
                clippent pas à 1.0 dans le buffer — sans ça les néons saturés
                ressortent en "trous noirs" après Bloom/DoF. */}
            <EffectComposer
                multisampling={0}
                enableNormalPass={false}
                frameBufferType={HalfFloatType}
            >
                {/* Ordre cinéma : DoF AVANT Bloom. Le flou s'applique sur
                    l'image nette, puis le glow s'ajoute sur les zones floues
                    sans créer d'anneau sombre au bord du bokeh.
                    worldFocusDistance=15 ≈ distance caméra→bâtiment principal
                    (cam y=2.5/z=5 → bâtiment z=-10) → façade parfaitement
                    nette. worldFocusRange=3 resserre la zone nette pour que
                    les câbles proches (distance ~4-5) ET l'horizon (≥100)
                    sortent du focus. focalLength=0.04 → bokeh prononcé hors
                    zone, bokehScale=3.0 calibre la taille des cercles. */}
                <DepthOfField
                    worldFocusDistance={15}
                    worldFocusRange={3}
                    focalLength={0.04}
                    bokehScale={3.0}
                    height={480}
                />
                {/* Bloom recalibré "néons dominants" : threshold 0.7 → seules
                    les emissives très brillantes (fenêtres bâtiment à
                    intensity=3) passent largement, les surfaces moyennement
                    lumineuses (data pulse 1.4, câbles ~1.4) passent moins
                    fort, la route reste sous le seuil → les néons "bavent"
                    plus dans l'atmosphère bleue, pas le sol. intensity 1.15
                    + smoothing 0.55 = transition franche dans le bloom,
                    halo plus présent autour des fenêtres allumées. */}
                <Bloom
                    intensity={1.15}
                    luminanceThreshold={0.7}
                    luminanceSmoothing={0.55}
                    mipmapBlur
                    height={360}
                />
                {/* Vignette : assombrissement périphérique → focus naturel
                    sur le centre, renforce la profondeur cinéma. */}
                <Vignette
                    darkness={0.55}
                    offset={0.32}
                    blendFunction={BlendFunction.NORMAL}
                />
                {/* Grain pellicule en NORMAL avec opacité minuscule. SOFT_LIGHT
                    + premultiply assombrissait les pixels HDR (formule × alpha
                    pré-multipliée sur base > 1 produit du noir au centre). */}
                <Noise
                    opacity={0.025}
                    blendFunction={BlendFunction.NORMAL}
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
                    gl={{
                        antialias: false,
                        powerPreference: 'high-performance',
                        toneMappingExposure: 0.5,
                    }}
                    dpr={[1, 1]}
                    frameloop={frameloop}
                    shadows="soft"
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
