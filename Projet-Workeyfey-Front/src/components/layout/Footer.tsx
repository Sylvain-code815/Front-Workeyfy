import './Footer.css'

export default function Footer() {
    return (
        <footer className="Footer">
            <div className="Footer-stage">
                {/* THREE.JS ANIMATION CANVAS: The giant 3D braided cable plugs in here */}
                <div className="Footer-canvas" data-webgl-slot="footer-cable" aria-hidden="true" />
                <div className="Footer-stage-fade" aria-hidden="true" />
            </div>

            <div className="Footer-inner">
                <section className="Footer-climax">
                    <h2 className="Footer-headline">Power up your infrastructure.</h2>

                    <div className="Footer-cta-row">
                        <button type="button" className="Footer-cta-primary">
                            <span>Démarrer un projet</span>
                            <span className="Footer-cta-arrow" aria-hidden="true">→</span>
                        </button>
                    </div>
                </section>

                <div className="Footer-grid">
                    <div className="Footer-col Footer-col--brand">
                        <span className="Footer-logo">WORKIFY</span>
                        <p className="Footer-tagline">
                            Studio technique haut de gamme. Nous concevons des produits web immersifs,
                            performants et taillés pour la croissance B2B.
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
            </div>
        </footer>
    )
}
