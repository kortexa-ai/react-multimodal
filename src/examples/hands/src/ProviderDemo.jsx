import { useEffect, useState, useCallback } from "react";
import { Hand, HandMetal, Video, VideoOff } from "lucide-react";
import { useCameraControl } from "../../../index";
import CameraView from "../../common/src/CameraView";
import StatusDot from "../../common/src/StatusDot";

function ProviderDemo() {
    const cam = useCameraControl();

    const [isCameraOn, setIsCameraOn] = useState(cam?.isOn || false);
    const [cameraErrorMessage, setCameraErrorMessage] = useState("");
    const [currentStream, setCurrentStream] = useState(null);

    const [isHandTracking, setIsHandTracking] = useState(false);
    const [handsErrorMessage, setHandsErrorMessage] = useState("");

    useEffect(() => {
        const handleStreamChange = (stream) => {
            setCurrentStream(stream);
            if (stream) {
                setIsCameraOn(true);
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
        if (!cam) return;

        const handleCamError = (error) => {
            console.error("Camera Error in Hands Demo:", error);
            setCameraErrorMessage(
                typeof error === "string"
                    ? error
                    : error?.message || "Unknown camera error"
            );
        };
        const handleCamStarted = () => {
            setIsCameraOn(true);
            setCameraErrorMessage("");
        };
        const handleCamStopped = () => {
            setIsCameraOn(false);
        };

        const errorListenerId = cam.addErrorListener(handleCamError);
        const startListenerId = cam.addStartedListener(handleCamStarted);
        const stopListenerId = cam.addStoppedListener(handleCamStopped);

        return () => {
            cam.removeErrorListener(errorListenerId);
            cam.removeStartedListener(startListenerId);
            cam.removeStoppedListener(stopListenerId);
        };
    }, [cam]);

    const handleToggleCamera = useCallback(async () => {
        if (!cam) return;
        setCameraErrorMessage("");
        try {
            if (cam.isOn) {
                await cam.stopCamera();
            } else {
                await cam.startCamera();
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
        <div className="card-container">
            <h2 className="card-title">Hands Provider Demo</h2>
            <div className="camera-view-container">
                <CameraView stream={currentStream} />
            </div>
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
                    title={isCameraOn ? "Stop Camera" : "Start Camera"}
                >
                    {isCameraOn ? <VideoOff /> : <Video />}
                </button>
                <StatusDot isActive={isCameraOn} />

                <span className="control-separator"></span>

                <button
                    onClick={handleToggleHandTracking}
                    disabled={!isCameraOn}
                    title={
                        isHandTracking
                            ? "Stop Hand Tracking"
                            : "Start Hand Tracking"
                    }
                >
                    {isHandTracking ? <HandMetal /> : <Hand />}
                </button>
                <StatusDot isActive={isHandTracking} />
            </div>
        </div>
    );
}

export default ProviderDemo;
