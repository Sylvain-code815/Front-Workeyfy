import { Suspense, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import FooterHeroScene from '../canvas/FooterHeroScene'
import { useCanvasFrameloop } from '../../hooks/useCanvasFrameloop'
import './Footer.css'

export default function Footer() {
    const footerRef = useRef<HTMLElement>(null)
    const powerRef = useRef<HTMLElement>(null)
    const ctaRef = useRef<HTMLButtonElement>(null)
    const ctaLabelRef = useRef<HTMLSpanElement>(null)
    const frameloop = useCanvasFrameloop(powerRef)

    useEffect(() => {
        const btn = ctaRef.current
        const label = ctaLabelRef.current
        if (!btn || !label) return

        const desktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)')
        if (!desktop.matches) return

        const maxOffset = 10

        const onMove = (e: MouseEvent) => {
            const rect = btn.getBoundingClientRect()
            const cx = rect.left + rect.width / 2
            const cy = rect.top + rect.height / 2
            const dx = Math.max(-maxOffset, Math.min(maxOffset, (e.clientX - cx) * 0.35))
            const dy = Math.max(-maxOffset, Math.min(maxOffset, (e.clientY - cy) * 0.35))
            btn.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
            label.style.transform = `translate3d(${dx * 0.5}px, ${dy * 0.5}px, 0)`
        }

        const reset = () => {
            btn.style.transform = 'translate3d(0, 0, 0)'
            label.style.transform = 'translate3d(0, 0, 0)'
        }

        btn.addEventListener('mousemove', onMove)
        btn.addEventListener('mouseleave', reset)
        return () => {
            btn.removeEventListener('mousemove', onMove)
            btn.removeEventListener('mouseleave', reset)
            reset()
        }
    }, [])

    return (
        <footer ref={footerRef} className="Footer">
            <section ref={powerRef} className="Footer-power">
                <div className="Footer-power-canvas" aria-hidden="true">
                    <Canvas
                        className="Footer-power-canvas-gl"
                        camera={{ position: [0, 0, 5.4], fov: 38 }}
                        dpr={[1, window.matchMedia('(max-width: 1024px)').matches ? 1.5 : 2]}
                        frameloop={frameloop}
                        gl={{ antialias: true, powerPreference: 'low-power', alpha: true }}
                    >
                        <Suspense fallback={null}>
                            <FooterHeroScene />
                        </Suspense>
                    </Canvas>
                </div>

                <div className="Footer-power-scrim" aria-hidden="true" />

                <div className="Footer-power-content">
                    <h2 className="Footer-headline">Power up your infrastructure.</h2>
                    <div className="Footer-cta-row">
                        <button ref={ctaRef} type="button" className="Footer-cta-primary">
                            <span ref={ctaLabelRef} className="Footer-cta-label">
                                <span>Démarrer un projet</span>
                                <span className="Footer-cta-arrow" aria-hidden="true">→</span>
                            </span>
                        </button>
                    </div>
                </div>
            </section>

            <section className="Footer-info">
                <div className="Footer-grid">
                    <div className="Footer-col Footer-col--brand">
                        <span className="Footer-logo">WORKIFY</span>
                        <p className="Footer-tagline">
                            Studio technique haut de gamme. Produits web immersifs, performants,
                            taillés pour la croissance B2B.
                        </p>
                    </div>

                    <nav className="Footer-col Footer-col--nav" aria-label="Navigation pied de page">
                        <span className="Footer-col-title">Explorer</span>
                        <ul>
                            <li><a href="#projets">Projets</a></li>
                            <li><a href="#lab">Lab 3D</a></li>
                        </ul>
                    </nav>

                    <div className="Footer-col Footer-col--legal">
                        <span className="Footer-col-title">Connect</span>
                        <ul>
                            <li><a href="https://www.linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a></li>
                            <li><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a></li>
                            <li><a href="#legal">Mentions légales</a></li>
                        </ul>
                    </div>
                </div>

                <div className="Footer-baseline">
                    <span>© {new Date().getFullYear()} Workify — Tous droits réservés.</span>
                </div>
            </section>
        </footer>
    )
}
