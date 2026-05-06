import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Scene from '../components/canvas/Scene';
import { useCanvasFrameloop } from '../hooks/useCanvasFrameloop';
import BackendTransition from '../components/sections/BackendTransition';
import GameUniverseTransition from '../components/sections/GameUniverseTransition';
import ProjectDeployed from '../components/sections/ProjectDeployed';
import ContactButton from '../components/layout/ContactButton';
import { usePageTheme } from '../contexts/PageThemeContext';
import './Home.css';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
    const { setTheme } = usePageTheme();
    const heroRef = useRef<HTMLElement>(null);
    const sceneProgressRef = useRef<{ value: number }>({ value: 0 });
    const heroFrameloop = useCanvasFrameloop(heroRef);

    useEffect(() => {
        setTheme('dark');
    }, [setTheme]);

    useEffect(() => {
        const el = heroRef.current;
        if (!el) return;
        const ctx = gsap.context(() => {
            gsap.to(sceneProgressRef.current, {
                value: 1,
                ease: 'none',
                scrollTrigger: {
                    trigger: el,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: true,
                },
            });
        }, el);
        return () => ctx.revert();
    }, []);

    return (
        <main className="Home">
            <section ref={heroRef} className="Home-hero">
                <div className="Home-hero-sticky">
                    <Canvas
                        className="Home-canvas"
                        camera={{ position: [0, 0, 0], fov: 25 }}
                        dpr={[1, 1]}
                        frameloop={heroFrameloop}
                        gl={{ antialias: false, powerPreference: 'high-performance' }}
                    >
                        <Suspense fallback={null}>
                            <Scene progressRef={sceneProgressRef} />
                        </Suspense>
                    </Canvas>
                </div>
            </section>

            <BackendTransition />

            <GameUniverseTransition />

            <ProjectDeployed />

            <ContactButton fixed />
        </main>
    );
}
