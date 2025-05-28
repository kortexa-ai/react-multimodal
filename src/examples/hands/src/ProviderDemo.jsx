import { useEffect, useState, useCallback } from "react";
import { Hand, HandMetal, Video, VideoOff } from "lucide-react";
import { useCamera, useHandsControl } from "../../../index";
import CameraView from "../../common/src/CameraView";
import StatusDot from "../../common/src/StatusDot";

function ProviderDemo() {
    const cam = useCamera();
    const hands = useHandsControl();

    const [isCameraOn, setIsCameraOn] = useState(cam?.isRecording || false);
    const [cameraErrorMessage, setCameraErrorMessage] = useState("");
    const [currentStream, setCurrentStream] = useState(null);
    const [videoElementForHands, setVideoElementForHands] = useState(null);

    const [isHandTracking, setIsHandTracking] = useState(false);
    const [handsErrorMessage, setHandsErrorMessage] = useState("");
    const [detectedHandData, setDetectedHandData] = useState(null);

    useEffect(() => {
        const handleStream = (stream) => {
            setCurrentStream(stream);
            if (stream) {
                setIsCameraOn(true);
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
        if (!cam) return;

        const handleCamError = (error) => {
            console.error("Camera Error in Hands Demo:", error);
            setCameraErrorMessage(
                typeof error === "string"
                    ? error
                    : error?.message || "Unknown camera error"
            );
        };
        const handleCamStart = () => {
            setIsCameraOn(true);
            setCameraErrorMessage("");
        };
        const handleCamStop = () => {
            setIsCameraOn(false);
        };

        const errorListenerId = cam.addErrorListener(handleCamError);
        const startListenerId = cam.addStartListener(handleCamStart);
        const stopListenerId = cam.addStopListener(handleCamStop);

        setIsCameraOn(cam.isRecording);
        if (cam.isRecording && cam.stream) {
            setCurrentStream(cam.stream);
        } else {
            setCurrentStream(null);
        }

        return () => {
            cam.removeErrorListener(errorListenerId);
            cam.removeStartListener(startListenerId);
            cam.removeStopListener(stopListenerId);
        };
    }, [cam]);

    useEffect(() => {
        if (!hands) return;

        const handleData = (data) => {
            setDetectedHandData(data);
            setIsHandTracking(true);
            setHandsErrorMessage("");
        };

        const handleError = (error) => {
            console.error("Hands error in demo:", error);
            setHandsErrorMessage(error.message || "Hand tracking error");
            setIsHandTracking(false);
        };

        const dataId = hands.addHandsDataListener(handleData);
        const errorId = hands.addErrorListener(handleError);

        return () => {
            hands.removeHandsDataListener(dataId);
            hands.removeErrorListener(errorId);
        };
    }, [hands]);

    const handleToggleCamera = useCallback(async () => {
        if (!cam) return;
        setCameraErrorMessage("");
        try {
            if (cam.isRecording) {
                if (isHandTracking && hands) {
                    hands.stopTracking();
                    setIsHandTracking(false);
                    setDetectedHandData(null);
                }
                cam.stop();
            } else {
                cam.start();
            }
        } catch (error) {
            console.error("Failed to toggle camera:", error);
            setCameraErrorMessage(error.message || "Failed to toggle camera");
        }
    }, [cam, hands, isHandTracking]);

    const handleToggleHandTracking = useCallback(async () => {
        setHandsErrorMessage("");
        if (!hands) {
            setHandsErrorMessage("Hands provider not available.");
            return;
        }

        if (isHandTracking) {
            hands.stopTracking();
            setIsHandTracking(false);
            setDetectedHandData(null);
        } else {
            if (!isCameraOn) {
                setHandsErrorMessage(
                    "Camera must be on to start hand tracking."
                );
                return;
            }
            if (!videoElementForHands) {
                setHandsErrorMessage(
                    "Video element not yet available for hand tracking."
                );
                return;
            }
            if (
                !videoElementForHands.srcObject ||
                !videoElementForHands.srcObject.active
            ) {
                setHandsErrorMessage(
                    "Video element does not have an active stream."
                );
                return;
            }
            try {
                hands.startTracking(videoElementForHands);
                // If startTracking itself doesn't set isHandTracking,
                // we might optimistically set it here,
                // but let's wait for data/error events first as per current design.
            } catch (error) {
                console.error(
                    "Error directly from hands.startTracking call:",
                    error
                );
                setHandsErrorMessage(
                    error.message || "Failed to start hand tracking."
                );
                setIsHandTracking(false); // Ensure it's false if start failed
            }
        }
    }, [isCameraOn, videoElementForHands, hands, isHandTracking]);

    return (
        <div className="card-container">
            <h2 className="card-title">Hands Provider Demo</h2>
            <div className="camera-view-container">
                <CameraView
                    stream={currentStream}
                    onVideoElementReady={setVideoElementForHands}
                    handsData={detectedHandData}
                />
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
