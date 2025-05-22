import React from "react";
import { MediaProvider } from "../../../index.ts";
import ProviderDemo from "./ProviderDemo.jsx";

function App() {
    return (
        <MediaProvider
            // Optional: Add cameraProps or microphoneProps if needed by MediaProvider
            // cameraProps={{ initialFacingMode: 'user' }}
            // microphoneProps={{ autoStart: false }}
        >
            <div className="App">
                <h1>Media Provider Example</h1>
                <ProviderDemo />
            </div>
        </MediaProvider>
    );
}

export default App;
