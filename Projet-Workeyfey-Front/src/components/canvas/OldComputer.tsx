import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';
import { createCentralSchemaTexture } from './schemaTexture';

type OldComputerGLTF = GLTF & {
    nodes: {
        Old_Computer_Old_Computer_0: THREE.Mesh;
        Old_Computer_Glass_0: THREE.Mesh;
    };
    materials: {
        Old_Computer: THREE.MeshStandardMaterial;
        Glass: THREE.MeshPhysicalMaterial;
    };
};

const TARGET_HEIGHT = 1.0;

const schemaTexture = createCentralSchemaTexture();
const defaultScreenMaterial = new THREE.MeshStandardMaterial({
    color: '#000810',
    emissive: new THREE.Color('#00E5FF'),
    emissiveMap: schemaTexture,
    emissiveIntensity: 1.4,
    roughness: 0.6,
    metalness: 0.1,
    toneMapped: false,
});

type OldComputerProps = JSX.IntrinsicElements['group'] & {
    screenMaterial?: THREE.Material;
};

export default function OldComputer({ screenMaterial, ...props }: OldComputerProps) {
    const gltf = useGLTF('/old_computer.glb') as unknown as OldComputerGLTF;
    const { nodes, materials, scene } = gltf;

    const { fitScale, offset } = useMemo(() => {
        const bbox = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bbox.getSize(size);
        bbox.getCenter(center);
        const fit = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
        return {
            fitScale: fit,
            offset: [
                -fit * center.x,
                -fit * bbox.min.y,
                -fit * center.z,
            ] as [number, number, number],
        };
    }, [scene]);

    const activeScreenMaterial = screenMaterial ?? defaultScreenMaterial;

    return (
        <group {...props}>
            <group scale={fitScale} position={offset}>
                <group rotation={[-Math.PI / 2, 0, 0]}>
                    <group position={[-14.137, 8.521, 14.193]}>
                        <mesh
                            geometry={nodes.Old_Computer_Old_Computer_0.geometry}
                            material={materials.Old_Computer}
                        />
                        <mesh
                            geometry={nodes.Old_Computer_Glass_0.geometry}
                            material={activeScreenMaterial}
                        />
                    </group>
                </group>
            </group>
        </group>
    );
}

useGLTF.preload('/old_computer.glb');
