import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Lab from './pages/Lab';
import { PageThemeProvider } from './contexts/PageThemeContext';
import { TunnelProvider } from './tunnel/TunnelContext';
import QuantumTunnelOverlay from './tunnel/QuantumTunnelOverlay';

// Reset the page scroll on every route change. Without this, a SPA
// navigation keeps the previous scroll offset which can land the user
// mid-page on the new route. Instant (no smooth) so it never fights the
// tunnel-overlay entry animation.
function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [pathname]);
    return null;
}

function App() {
    return (
        <TunnelProvider>
            <PageThemeProvider>
                <ScrollToTop />
                <Header />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/lab" element={<Lab />} />
                </Routes>
                <Footer />
            </PageThemeProvider>
            <QuantumTunnelOverlay />
        </TunnelProvider>
    );
}

export default App;
