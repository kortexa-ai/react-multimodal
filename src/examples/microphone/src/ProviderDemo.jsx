import { useEffect, useState, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { useMicrophone } from "../../../index";
import MicrophoneView from "../../common/src/MicrophoneView";
import StatusDot from "../../common/src/StatusDot";

function ProviderDemo() {
    const mic = useMicrophone();
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (!mic) return;

        const handleMicError = (error) => {
            console.error("Microphone Error:", error);
            setErrorMessage(
                typeof error === "string"
                    ? error
                    : error?.message || "Unknown microphone error"
            );
        };

        const handleMicStarted = () => {
            console.log("Microphone started in ProviderDemo");
            setErrorMessage("");
        };

        const handleMicStopped = () => {
            console.log("Microphone stopped in ProviderDemo");
        };

        const errorListenerId = mic.addErrorListener(handleMicError);
        const startListenerId = mic.addStartListener(handleMicStarted);
        const stopListenerId = mic.addStopListener(handleMicStopped);

        return () => {
            mic.removeErrorListener(errorListenerId);
            mic.removeStartListener(startListenerId);
            mic.removeStopListener(stopListenerId);
        };
    }, [mic]);

    const handleToggleMicrophone = useCallback(async () => {
        setErrorMessage("");
        if (mic.isRecording) {
            mic.stop();
        } else {
            try {
                await mic.start();
            } catch (err) {
                setErrorMessage(err.message || "Failed to start microphone.");
            }
        }
    }, [mic]);

    return (
        <div className="card-container">
            <h2 className="card-title">Microphone Provider Demo</h2>
            <MicrophoneView mic={mic} />

            {errorMessage && (
                <p className="error-message">Error: {errorMessage}</p>
            )}
            <div className="button-row">
                <button onClick={handleToggleMicrophone} disabled={!mic}>
                    {mic && mic.isRecording ? <MicOff /> : <Mic />}
                </button>
                {mic && <StatusDot isActive={mic.isRecording} />}
            </div>
        </div>
    );
}

export default ProviderDemo;
