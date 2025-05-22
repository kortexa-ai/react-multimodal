import { MicrophoneProvider } from "../../../index.ts";
import ProviderDemo from "./ProviderDemo.jsx";

function App() {
    return (
        <MicrophoneProvider>
            <ProviderDemo />
        </MicrophoneProvider>
    );
}

export default App;
