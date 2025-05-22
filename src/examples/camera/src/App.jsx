import { CameraProvider } from "../../../index";
import ProviderDemo from "./ProviderDemo.jsx";

function App() {
    return (
        <CameraProvider
            requestedWidth={1280}
            requestedHeight={720}
            // Example event handlers (optional):
            // onStreamChange={(stream) => console.log('App: Stream changed', stream)}
            // onError={(error) => console.error('App: Camera error', error)}
        >
            <ProviderDemo />
        </CameraProvider>
    );
}

export default App;
