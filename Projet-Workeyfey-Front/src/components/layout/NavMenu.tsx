import { Link } from 'react-router-dom';
import './NavMenu.css';

type NavMenuProps = {
    onClose: () => void;
};

const items: { to: string; label: string }[] = [
    { to: '/', label: 'Home' },
    { to: '/projects', label: 'Projects' },
    { to: '/contacts', label: 'Contacts' },
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
                {items.map((item) => (
                    <Link
                        key={item.to}
                        to={item.to}
                        className="NavMenu-item"
                        onClick={onClose}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>
        </div>
    );
}
