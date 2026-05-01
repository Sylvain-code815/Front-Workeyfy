import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Produit from "./components/canvas/Produit";

function App() {
    return (
        <>
            <Header />
            <Canvas style={{ width: "100vw", height: "100vh" }} camera={{ position: [0, 2, 5], fov: 50 }}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <Suspense fallback={null}>
                    <Produit />
                </Suspense>
                <OrbitControls />
            </Canvas>
            <Footer />
        </>
    );
}

export default App
