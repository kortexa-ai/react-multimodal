import React from "react";
import { MicrophoneProvider } from "../../../index.ts";
import ProviderDemo from "./ProviderDemo.jsx";

function App() {
    return (
        <MicrophoneProvider>
            <div className="App">
                <h1>Microphone Provider Example</h1>
                <ProviderDemo />
            </div>
        </MicrophoneProvider>
    );
}

export default App;
