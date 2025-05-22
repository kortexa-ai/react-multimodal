import { CameraProvider } from "../../../index.ts";
import ProviderDemo from "./ProviderDemo.jsx";

function App() {
    return (
        <CameraProvider>
            <ProviderDemo />
        </CameraProvider>
    );
}

export default App;
