import { CompositeMediaProvider } from "../../../index";
import ProviderDemo from "./ProviderDemo.jsx";

function App() {
    return (
        <CompositeMediaProvider
            cameraProps={{
                requestedWidth: 1280,
                requestedHeight: 720,
                // initialFacingMode: 'user' // This could also be here if needed
            }}
            // microphoneProps={{ autoStart: false }}
        >
            <ProviderDemo />
        </CompositeMediaProvider>
    );
}

export default App;
