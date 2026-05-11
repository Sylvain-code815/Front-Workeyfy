import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import './Header.css';
import NavMenu from './NavMenu';
import { usePageTheme } from '../../contexts/PageThemeContext';

export default function Header() {
    const [open, setOpen] = useState<boolean>(false);
    const { theme } = usePageTheme();
    const headerRef = useRef<HTMLElement>(null);

    // Auto-hide on downward scroll, reveal on upward scroll. Mobile-only
    // pattern (the desktop already has plenty of vertical space). Driven
    // via GSAP so the slide-in/out reads as part of the motion language
    // and stays interruptible — a fast scroll-up cancels the hide tween
    // mid-flight without a CSS-transition jank.
    useEffect(() => {
        const el = headerRef.current;
        if (!el) return;
        const HIDE_THRESHOLD = 12; // px of scroll-down before hiding
        const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
        let lastY = window.scrollY;
        let hidden = false;

        const onScroll = () => {
            if (!isMobile()) {
                // Restore on resize back to desktop.
                if (hidden) {
                    gsap.to(el, { yPercent: 0, duration: 0.3, ease: 'power3.out' });
                    hidden = false;
                }
                lastY = window.scrollY;
                return;
            }
            const y = window.scrollY;
            const dy = y - lastY;
            // Near the top: always show.
            if (y < 24 && hidden) {
                gsap.to(el, { yPercent: 0, duration: 0.28, ease: 'power3.out' });
                hidden = false;
            } else if (dy > HIDE_THRESHOLD && !hidden) {
                gsap.to(el, { yPercent: -120, duration: 0.32, ease: 'power3.inOut' });
                hidden = true;
            } else if (dy < -HIDE_THRESHOLD && hidden) {
                gsap.to(el, { yPercent: 0, duration: 0.32, ease: 'power3.out' });
                hidden = false;
            }
            lastY = y;
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Force the header back to visible whenever the menu opens, otherwise
    // tapping the round button after auto-hide would dismiss the panel
    // visually mid-animation.
    useEffect(() => {
        if (!open) return;
        const el = headerRef.current;
        if (!el) return;
        gsap.to(el, { yPercent: 0, duration: 0.2, ease: 'power3.out' });
    }, [open]);

    return (
        <>
            <header
                ref={headerRef}
                className={`Header${theme === 'light' ? ' Header--light' : ''}`}
            >
                <Link to="/" className="Header-logo-link">
                    <h1 className="Header-logo">Workeyfy</h1>
                </Link>
                <button
                    className="Header-nav-btn"
                    onClick={() => setOpen(true)}
                    aria-label="Ouvrir le menu"
                >
                    <span className="Header-nav-btn-label">Menu</span>
                    <span className="Header-nav-btn-icon" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </span>
                </button>
            </header>
            {open && <NavMenu onClose={() => setOpen(false)} />}
        </>
    );
}
