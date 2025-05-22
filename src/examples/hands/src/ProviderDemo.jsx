import { useEffect, useState, useCallback } from "react";
import { Hand, Video, VideoOff } from "lucide-react";
import { CameraProvider, useCamera } from "../../../index";
import CameraView from "../../common/src/CameraView";
import StatusDot from "../../common/src/StatusDot";

function ProviderDemo() {
    const cam = useCamera();

    const [isCameraOn, setIsCameraOn] = useState(cam?.isOn || false);
    const [cameraErrorMessage, setCameraErrorMessage] = useState("");

    const [isHandTracking, setIsHandTracking] = useState(false);
    const [handsErrorMessage, setHandsErrorMessage] = useState("");

    useEffect(() => {
        if (!cam) return;

        const updateCameraStatus = () => setIsCameraOn(cam.isOn);
        const handleCamError = (error) => {
            console.error("Camera Error in Hands Demo:", error);
            setCameraErrorMessage(
                typeof error === "string"
                    ? error
                    : error?.message || "Unknown camera error"
            );
        };
        const handleCamStarted = () => {
            console.log("Camera started in Hands Demo");
            setIsCameraOn(true);
            setCameraErrorMessage("");
        };
        const handleCamStopped = () => {
            console.log("Camera stopped in Hands Demo");
            setIsCameraOn(false);
        };

        updateCameraStatus();
        const errorListenerId = cam.addErrorListener(handleCamError);
        const startListenerId = cam.addStartListener(handleCamStarted);
        const stopListenerId = cam.addStopListener(handleCamStopped);

        return () => {
            cam.removeErrorListener(errorListenerId);
            cam.removeStartListener(startListenerId);
            cam.removeStopListener(stopListenerId);
        };
    }, [cam]);

    const handleToggleCamera = useCallback(async () => {
        if (!cam) return;
        setCameraErrorMessage("");
        try {
            if (cam.isOn) {
                await cam.stop();
            } else {
                await cam.start();
            }
        } catch (error) {
            console.error("Failed to toggle camera:", error);
            setCameraErrorMessage(error.message || "Failed to toggle camera");
        }
    }, [cam]);

    const handleToggleHandTracking = useCallback(async () => {
        setHandsErrorMessage("");
        if (isHandTracking) {
            console.log("Stopping hand tracking (placeholder)");
            setIsHandTracking(false);
        } else {
            if (!isCameraOn || !cam?.videoRef?.current) {
                setHandsErrorMessage(
                    "Camera must be on to start hand tracking."
                );
                return;
            }
            console.log(
                "Starting hand tracking (placeholder) with video element:",
                cam.videoRef.current
            );
            setIsHandTracking(true);
        }
    }, [isCameraOn, isHandTracking, cam?.videoRef]);

    return (
        <div className="provider-demo-container">
            <div className="status-section">
                <div className="status-item">
                    <span>Camera:</span>
                    <StatusDot isOn={isCameraOn} />
                    <span>{isCameraOn ? "ON" : "OFF"}</span>
                </div>
                <div className="status-item">
                    <span>Hand Tracking:</span>
                    <StatusDot isOn={isHandTracking} />
                    <span>{isHandTracking ? "ACTIVE" : "INACTIVE"}</span>
                </div>
            </div>

            <CameraView cam={cam} />
            {cameraErrorMessage && (
                <p className="error-message">
                    Camera Error: {cameraErrorMessage}
                </p>
            )}
            {handsErrorMessage && (
                <p className="error-message">
                    Hands Error: {handsErrorMessage}
                </p>
            )}

            <div className="button-row">
                <button
                    onClick={handleToggleCamera}
                    disabled={!cam}
                    className={`control-button ${
                        isCameraOn ? "button-on" : ""
                    }`}
                >
                    {isCameraOn ? <VideoOff size={20} /> : <Video size={20} />}
                    {isCameraOn ? "Stop Camera" : "Start Camera"}
                </button>
                <button
                    onClick={handleToggleHandTracking}
                    disabled={!isCameraOn}
                    className={`control-button ${
                        isHandTracking ? "button-on" : ""
                    }`}
                >
                    <Hand size={20} />
                    {isHandTracking
                        ? "Stop Hand Tracking"
                        : "Start Hand Tracking"}
                </button>
            </div>
        </div>
    );
}

const HandsDemoContainer = () => {
    return (
        <CameraProvider
            options={{
                video: { width: { ideal: 640 }, height: { ideal: 480 } },
            }}
        >
            <ProviderDemo />
        </CameraProvider>
    );
};

export default HandsDemoContainer;
