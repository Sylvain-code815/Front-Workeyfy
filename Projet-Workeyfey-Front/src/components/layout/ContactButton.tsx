import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import './ContactButton.css';

type ContactButtonProps = {
    fixed?: boolean;
};

export default function ContactButton({ fixed = false }: ContactButtonProps) {
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        if (!fixed) return;

        let obs: IntersectionObserver | null = null;
        let cancelled = false;

        const attach = () => {
            if (cancelled) return;
            const footer = document.querySelector('.Footer');
            if (!footer) {
                requestAnimationFrame(attach);
                return;
            }
            obs = new IntersectionObserver(
                ([entry]) => {
                    // flushSync bypasses concurrent batching so the DOM class
                    // (and pointer-events: none) lands within one frame of the
                    // footer crossing the viewport — otherwise React 19 may
                    // defer the commit while Three.js useFrame is hot.
                    flushSync(() => setHidden(entry.isIntersecting));
                },
                { threshold: 0.05 },
            );
            obs.observe(footer);
        };

        attach();

        return () => {
            cancelled = true;
            obs?.disconnect();
        };
    }, [fixed]);

    const className = [
        'ContactButton',
        fixed && 'ContactButton--fixed',
        hidden && 'ContactButton--hidden',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <a
            href="mailto:hello@workify.com"
            className={className}
            aria-hidden={hidden || undefined}
            tabIndex={hidden ? -1 : 0}
        >
            Contact
        </a>
    );
}
