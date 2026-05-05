import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from '../components/canvas/Scene';
import './Home.css';

export default function Home() {
    const [started, setStarted] = useState(false);

    return (
        <main className="Home">
            <Canvas
                className="Home-canvas"
                camera={{ position: [0.27, 1.529, -0.4], fov: 50 }}
            >
                <Suspense fallback={null}>
                    <Scene
                        started={started}
                        onStart={() => setStarted(true)}
                        onReset={() => setStarted(false)}
                    />
                </Suspense>
            </Canvas>

            <a href="mailto:hello@workify.com" className="Home-contact-btn">
                Contact
            </a>
        </main>
    );
}
