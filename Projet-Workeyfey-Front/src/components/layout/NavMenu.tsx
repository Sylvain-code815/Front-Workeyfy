import { Link } from 'react-router-dom';
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
    { kind: 'mailto', href: 'mailto:hello@workify.com', label: 'Contact' },
];

export default function NavMenu({ onClose }: NavMenuProps) {
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
                            onClick={onClose}
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
