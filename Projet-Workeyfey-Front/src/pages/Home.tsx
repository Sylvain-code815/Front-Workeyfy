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
        document.documentElement.classList.add('Home-snap');
        return () => document.documentElement.classList.remove('Home-snap');
    }, []);

    useEffect(() => {
        const el = heroRef.current;
        if (!el) return;

        const ctx = gsap.context(() => {
            const tween = gsap.fromTo(
                sceneProgressRef.current,
                { value: 0 },
                {
                    value: 1,
                    duration: 2.4,
                    ease: 'power2.inOut',
                    paused: true,
                },
            );

            let played = window.scrollY > 10;
            if (played) tween.progress(1);

            let touchStartY = 0;

            const trigger = () => {
                if (played) return;
                played = true;
                tween.restart();
                removeListeners();
            };

            const onWheel = (e: WheelEvent) => {
                if (played) return;
                if (e.deltaY > 0 && window.scrollY < 10) {
                    e.preventDefault();
                    trigger();
                }
            };

            const onTouchStart = (e: TouchEvent) => {
                touchStartY = e.touches[0]?.clientY ?? 0;
            };

            const onTouchMove = (e: TouchEvent) => {
                if (played) return;
                const dy = touchStartY - (e.touches[0]?.clientY ?? 0);
                if (dy > 5 && window.scrollY < 10) {
                    e.preventDefault();
                    trigger();
                }
            };

            const onHeroStart = () => trigger();

            const removeListeners = () => {
                window.removeEventListener('wheel', onWheel);
                window.removeEventListener('touchstart', onTouchStart);
                window.removeEventListener('touchmove', onTouchMove);
                window.removeEventListener('hero-start', onHeroStart);
            };

            window.addEventListener('wheel', onWheel, { passive: false });
            window.addEventListener('touchstart', onTouchStart, { passive: true });
            window.addEventListener('touchmove', onTouchMove, { passive: false });
            window.addEventListener('hero-start', onHeroStart);

            ScrollTrigger.create({
                trigger: el,
                start: 'top center',
                onEnterBack: () => {
                    tween.restart();
                },
            });

            return () => removeListeners();
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
