import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from '../components/canvas/Scene';
import ContactButton from '../components/layout/ContactButton';
import { usePageTheme } from '../contexts/PageThemeContext';
import './Home.css';

export default function Home() {
    const [started, setStarted] = useState(false);
    const { setTheme } = usePageTheme();

    useEffect(() => {
        setTheme('dark');
    }, [setTheme]);

    return (
        <main className="Home">
            <Canvas
                className="Home-canvas"
                camera={{ position: [0, 0.4, 0.85], fov: 50 }}
            >
                <Suspense fallback={null}>
                    <Scene
                        started={started}
                        onStart={() => setStarted(true)}
                        onReset={() => setStarted(false)}
                    />
                </Suspense>
            </Canvas>

            <ContactButton fixed />
        </main>
    );
}
