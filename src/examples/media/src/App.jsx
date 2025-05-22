import { MediaProvider } from "../../../index.ts";
import ProviderDemo from "./ProviderDemo.jsx";

function App() {
    return (
        <MediaProvider
            // Optional: Add cameraProps or microphoneProps if needed by MediaProvider
            // cameraProps={{ initialFacingMode: 'user' }}
            // microphoneProps={{ autoStart: false }}
        >
            <ProviderDemo />
        </MediaProvider>
    );
}

export default App;
