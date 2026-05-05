import { Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Projects from './pages/Projects';
import { PageThemeProvider } from './contexts/PageThemeContext';

function App() {
    return (
        <PageThemeProvider>
            <Header />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/projects" element={<Projects />} />
            </Routes>
            <Footer />
        </PageThemeProvider>
    );
}

export default App;
