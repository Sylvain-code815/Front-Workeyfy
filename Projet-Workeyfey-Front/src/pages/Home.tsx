import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Produit from '../components/canvas/Produit';
import './Home.css';

export default function Home() {
    return (
        <main className="Home">
            <Canvas
                className="Home-canvas"
                camera={{ position: [0, 2, 5], fov: 50 }}
            >
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <Suspense fallback={null}>
                    <Produit />
                </Suspense>
                <OrbitControls />
            </Canvas>

            <Link to="/contacts" className="Home-contact-btn">
                Contact
            </Link>
        </main>
    );
}
