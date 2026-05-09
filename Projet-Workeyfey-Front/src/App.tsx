import { Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Lab from './pages/Lab';
import { PageThemeProvider } from './contexts/PageThemeContext';
import { TunnelProvider } from './tunnel/TunnelContext';
import QuantumTunnelOverlay from './tunnel/QuantumTunnelOverlay';

function App() {
    return (
        <TunnelProvider>
            <PageThemeProvider>
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
