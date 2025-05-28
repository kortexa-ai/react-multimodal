import { useEffect, useState, useCallback } from "react";
import { Camera, CameraOff } from "lucide-react";
import { useCamera } from "../../../index";
import CameraView from "../../common/src/CameraView";
import StatusDot from "../../common/src/StatusDot";

function ProviderDemo() {
    const cam = useCamera();

    const [isCameraOn, setIsCameraOn] = useState(cam.isRecording);
    const [errorMessage, setErrorMessage] = useState("");
    const [currentStream, setCurrentStream] = useState(null);

    useEffect(() => {
        const handleStream = (stream) => {
            setCurrentStream(stream);
            if (stream) {
                setIsCameraOn(true);
                setErrorMessage("");
            } else {
                setIsCameraOn(false);
            }
        };

        const streamListenerId =
            cam.addStreamListener(handleStream);
        if (cam.stream) {
            handleStream(cam.stream);
        }

        return () => {
            cam.removeStreamListener(streamListenerId);
        };
    }, [cam]);

    useEffect(() => {
        const handleCameraStart = () => {
            setIsCameraOn(true);
            setErrorMessage("");
        };
        const handleCameraStop = () => {
            setIsCameraOn(false);
            setCurrentStream(null);
        };
        const handleCameraError = (error) => {
            setErrorMessage(
                error.message || "An unknown camera error occurred."
            );
            setIsCameraOn(false);
            setCurrentStream(null);
        };

        const startListenerId = cam.addStartListener(handleCameraStart);
        const stopListenerId = cam.addStopListener(handleCameraStop);
        const errorListenerId = cam.addErrorListener(handleCameraError);

        setIsCameraOn(cam.isRecording);
        if (cam.isRecording && cam.stream) {
            setCurrentStream(cam.stream);
        } else {
            setCurrentStream(null);
        }

        return () => {
            cam.removeStartListener(startListenerId);
            cam.removeStopListener(stopListenerId);
            cam.removeErrorListener(errorListenerId);
        };
    }, [cam]);

    const handleToggleCamera = useCallback(async () => {
        setErrorMessage("");
        if (cam.isRecording) {
            cam.stop();
        } else {
            try {
                await cam.start();
            } catch (err) {
                setErrorMessage(err.message || "Failed to start camera.");
            }
        }
    }, [cam]);

    return (
        <div className="card-container">
            <h2 className="card-title">Camera Provider Demo</h2>
            <div className="camera-view-container">
                <CameraView stream={currentStream} />
            </div>
            {errorMessage && (
                <p className="error-message">Error: {errorMessage}</p>
            )}
            <div className="button-row">
                <button
                    onClick={handleToggleCamera}
                    title={isCameraOn ? "Stop Camera" : "Start Camera"}
                >
                    {isCameraOn ? <CameraOff /> : <Camera />}
                </button>
                <StatusDot isActive={isCameraOn} />
            </div>
        </div>
    );
}

export default ProviderDemo;
