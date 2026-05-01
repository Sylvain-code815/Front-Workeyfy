import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import NavMenu from './NavMenu';

export default function Header() {
    const [open, setOpen] = useState<boolean>(false);

    return (
        <>
            <header className="Header">
                <Link to="/" className="Header-logo-link">
                    <h1 className="Header-logo">Workeyfy</h1>
                </Link>
                <button
                    className="Header-nav-btn"
                    onClick={() => setOpen(true)}
                    aria-label="Ouvrir le menu"
                >
                    Menu
                </button>
            </header>
            {open && <NavMenu onClose={() => setOpen(false)} />}
        </>
    );
}
