import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';
import { createQuantumCrmMobileTexture } from './quantumCrmMobileTexture';

const TARGET_HEIGHT = 1.0;

const cachedTexture = createQuantumCrmMobileTexture();

const defaultScreenMaterial = new THREE.MeshStandardMaterial({
    color: '#000810',
    emissive: new THREE.Color('#7FF7FF'),
    emissiveMap: cachedTexture,
    emissiveIntensity: 1.6,
    roughness: 0.35,
    metalness: 0.0,
    toneMapped: false,
});

type IPhoneProps = JSX.IntrinsicElements['group'] & {
    screenMaterial?: THREE.Material;
};

type Axis = 'x' | 'y' | 'z';

/**
 * Loads the iPhone GLB, reorients it so its longest axis becomes world +Y
 * (vertical) and its thinnest axis becomes world +Z (camera-facing), then
 * overlays a procedural screen on the +Z face. Sidesteps any assumption about
 * the exporter's axis convention — the model is always rendered upright and
 * facing the camera regardless of how the GLB was authored.
 */
export default function IPhone({ screenMaterial, ...props }: IPhoneProps) {
    const gltf = useGLTF('/3d_models/iphone_13_pro_2021.glb') as unknown as GLTF;

    const { sceneClone, fitScale, offset, screenPlane } = useMemo(() => {
        const clone = gltf.scene.clone(true);

        // The Sketchfab GLB embeds duplicate iPhone instances. Walk the scene
        // graph, find the first level where multiple "Iphone*" siblings appear,
        // and remove all but the first. More robust than matching a hard-coded
        // name — exporters sometimes rename the duplicate.
        const phoneNodes: THREE.Object3D[] = [];
        const visit = (node: THREE.Object3D) => {
            const localPhones = node.children.filter((c) => /^iphone/i.test(c.name));
            if (localPhones.length > 0) {
                phoneNodes.push(...localPhones);
                return;
            }
            node.children.forEach(visit);
        };
        visit(clone);
        phoneNodes.slice(1).forEach((p) => p.parent?.remove(p));

        // Inspect the GLB's natural axes from its untransformed bbox.
        const initialBbox = new THREE.Box3().setFromObject(clone);
        const initialSize = new THREE.Vector3();
        initialBbox.getSize(initialSize);

        const sorted = (['x', 'y', 'z'] as Axis[])
            .map((axis) => ({ axis, value: initialSize[axis] }))
            .sort((a, b) => b.value - a.value);
        const heightAxis = sorted[0].axis;
        const widthAxis = sorted[1].axis;
        const depthAxis = sorted[2].axis;

        // Build a rotation that maps the GLB's (width, height, depth) local
        // axes onto world (+X, +Y, +Z). This puts the phone upright with its
        // flat face toward the camera no matter which axis convention the
        // exporter chose.
        const widthVec = new THREE.Vector3();
        widthVec[widthAxis] = 1;
        const heightVec = new THREE.Vector3();
        heightVec[heightAxis] = 1;
        const depthVec = new THREE.Vector3();
        depthVec[depthAxis] = 1;
        // makeBasis requires a right-handed frame; flip width if needed.
        if (new THREE.Vector3().crossVectors(widthVec, heightVec).dot(depthVec) < 0) {
            widthVec.multiplyScalar(-1);
        }
        const basis = new THREE.Matrix4().makeBasis(widthVec, heightVec, depthVec);
        const inv = new THREE.Matrix4().copy(basis).invert();
        clone.quaternion.setFromRotationMatrix(inv);
        clone.updateMatrixWorld(true);

        // Recompute bbox in world space after the reorientation.
        const bbox = new THREE.Box3().setFromObject(clone);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bbox.getSize(size);
        bbox.getCenter(center);

        const fit = size.y > 0 ? TARGET_HEIGHT / size.y : 1;

        const planeWidth = size.x * 0.92;
        const planeHeight = size.y * 0.94;
        const planePos: [number, number, number] = [
            center.x,
            center.y,
            bbox.max.z + size.z * 0.005,
        ];

        return {
            sceneClone: clone,
            fitScale: fit,
            offset: [
                -fit * center.x,
                -fit * bbox.min.y,
                -fit * center.z,
            ] as [number, number, number],
            screenPlane: {
                width: planeWidth,
                height: planeHeight,
                position: planePos,
            },
        };
    }, [gltf]);

    const activeScreenMaterial = screenMaterial ?? defaultScreenMaterial;

    return (
        <group {...props}>
            <group scale={fitScale} position={offset}>
                <primitive object={sceneClone} />
                <mesh position={screenPlane.position}>
                    <planeGeometry args={[screenPlane.width, screenPlane.height]} />
                    <primitive object={activeScreenMaterial} attach="material" />
                </mesh>
            </group>
        </group>
    );
}

useGLTF.preload('/3d_models/iphone_13_pro_2021.glb');
