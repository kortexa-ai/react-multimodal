import React from "react";
import { CameraProvider } from "../../../index.ts";
import ProviderDemo from "./ProviderDemo.jsx";

function App() {
    return (
        <CameraProvider>
            <div className="App">
                <h1>Camera Provider Example</h1>
                <ProviderDemo />
            </div>
        </CameraProvider>
    );
}

export default App;
