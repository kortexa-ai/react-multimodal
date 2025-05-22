import { useEffect, useState, useCallback } from "react";
import { Camera, CameraOff } from "lucide-react";
import { useCameraControl } from "../../../index";
import CameraView from "../../common/src/CameraView";
import StatusDot from "../../common/src/StatusDot";

function ProviderDemo() {
    const cam = useCameraControl();

    const [isCameraOn, setIsCameraOn] = useState(cam.isOn);
    const [errorMessage, setErrorMessage] = useState("");
    const [currentStream, setCurrentStream] = useState(null);

    useEffect(() => {
        const handleStreamChange = (stream) => {
            setCurrentStream(stream);
            if (stream) {
                setIsCameraOn(true);
                setErrorMessage("");
            } else {
                setIsCameraOn(false);
            }
        };

        const streamListenerId =
            cam.addStreamChangedListener(handleStreamChange);
        if (cam.stream) {
            handleStreamChange(cam.stream);
        }

        return () => {
            cam.removeStreamChangedListener(streamListenerId);
        };
    }, [cam]);

    useEffect(() => {
        const handleCameraStarted = () => {
            setIsCameraOn(true);
            setErrorMessage("");
        };
        const handleCameraStopped = () => {
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

        const startListenerId = cam.addStartedListener(handleCameraStarted);
        const stopListenerId = cam.addStoppedListener(handleCameraStopped);
        const errorListenerId = cam.addErrorListener(handleCameraError);

        setIsCameraOn(cam.isOn);
        if (cam.isOn && cam.stream) {
            setCurrentStream(cam.stream);
        } else {
            setCurrentStream(null);
        }

        return () => {
            cam.removeStartedListener(startListenerId);
            cam.removeStoppedListener(stopListenerId);
            cam.removeErrorListener(errorListenerId);
        };
    }, [cam]);

    const handleToggleCamera = useCallback(async () => {
        setErrorMessage("");
        if (cam.isOn) {
            cam.stopCamera();
        } else {
            try {
                await cam.startCamera();
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
