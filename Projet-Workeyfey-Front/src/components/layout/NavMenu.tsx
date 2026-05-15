import { Link, useNavigate } from 'react-router-dom';
import type { MouseEvent } from 'react';
import { useTunnel } from '../../tunnel/TunnelContext';
import './NavMenu.css';

type NavMenuProps = {
    onClose: () => void;
};

type NavItem =
    | { kind: 'route'; to: string; label: string }
    | { kind: 'mailto'; href: string; label: string };

const items: NavItem[] = [
    { kind: 'route', to: '/', label: 'Home' },
    { kind: 'route', to: '/projects', label: 'Projects' },
    { kind: 'route', to: '/lab', label: 'Lab' },
    { kind: 'route', to: '/lab-scene', label: 'Lab Scene' },
    { kind: 'mailto', href: 'mailto:hello@workify.com', label: 'Contact' },
];

export default function NavMenu({ onClose }: NavMenuProps) {
    const navigate = useNavigate();
    const tunnel = useTunnel();

    const handleProjectsClick = (e: MouseEvent<HTMLAnchorElement>) => {
        // Only intercept plain left-click (no modifiers, no middle-click).
        if (
            e.defaultPrevented ||
            e.button !== 0 ||
            e.metaKey ||
            e.ctrlKey ||
            e.shiftKey ||
            e.altKey
        ) {
            onClose();
            return;
        }
        e.preventDefault();
        // Close the menu visually first, then start the tunnel.
        onClose();
        tunnel.startTunnel(() => navigate('/projects'));
    };

    return (
        <div
            className="NavMenu"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <button
                className="NavMenu-close"
                onClick={onClose}
                aria-label="Fermer le menu"
            >
                Close
            </button>
            <nav
                className="NavMenu-list"
                onClick={(e) => e.stopPropagation()}
            >
                {items.map((item) =>
                    item.kind === 'route' ? (
                        <Link
                            key={item.to}
                            to={item.to}
                            className="NavMenu-item"
                            onClick={
                                item.to === '/projects'
                                    ? handleProjectsClick
                                    : onClose
                            }
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <a
                            key={item.href}
                            href={item.href}
                            className="NavMenu-item"
                            onClick={onClose}
                        >
                            {item.label}
                        </a>
                    )
                )}
            </nav>
        </div>
    );
}
