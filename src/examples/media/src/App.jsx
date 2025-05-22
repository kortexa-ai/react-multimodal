import { MediaProvider } from "../../../index";
import ProviderDemo from "./ProviderDemo.jsx";

function App() {
    return (
        <MediaProvider
            cameraProps={{
                requestedWidth: 1280,
                requestedHeight: 720,
                // initialFacingMode: 'user' // This could also be here if needed
            }}
            // microphoneProps={{ autoStart: false }}
        >
            <ProviderDemo />
        </MediaProvider>
    );
}

export default App;
