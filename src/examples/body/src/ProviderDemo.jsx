import { useEffect, useState, useCallback } from "react";
import { User, UserCheck, Video, VideoOff } from "lucide-react";
import { useCamera, useBodyControl } from "../../../index";
import CameraView from "../../common/src/CameraView";
import StatusDot from "../../common/src/StatusDot";

function ProviderDemo() {
    const cam = useCamera();
    const body = useBodyControl();

    const [isCameraOn, setIsCameraOn] = useState(cam?.isRecording || false);
    const [cameraErrorMessage, setCameraErrorMessage] = useState("");
    const [currentStream, setCurrentStream] = useState(null);
    const [videoElementForBody, setVideoElementForBody] = useState(null);

    const [isBodyTracking, setIsBodyTracking] = useState(false);
    const [bodyErrorMessage, setBodyErrorMessage] = useState("");
    const [detectedBodyData, setDetectedBodyData] = useState(null);

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
            console.error("Camera Error in Body Demo:", error);
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
        if (!body) return;

        const handleData = (data) => {
            setDetectedBodyData(data);
            setIsBodyTracking(true);
            setBodyErrorMessage("");
        };

        const handleError = (error) => {
            console.error("Body error in demo:", error);
            setBodyErrorMessage(error.message || "Body tracking error");
            setIsBodyTracking(false);
        };

        const dataId = body.addBodyDataListener(handleData);
        const errorId = body.addErrorListener(handleError);

        return () => {
            body.removeBodyDataListener(dataId);
            body.removeErrorListener(errorId);
        };
    }, [body]);

    const handleToggleCamera = useCallback(async () => {
        if (!cam) return;
        setCameraErrorMessage("");
        try {
            if (cam.isRecording) {
                if (isBodyTracking && body) {
                    body.stopTracking();
                    setIsBodyTracking(false);
                    setDetectedBodyData(null);
                }
                cam.stop();
            } else {
                cam.start();
            }
        } catch (error) {
            console.error("Failed to toggle camera:", error);
            setCameraErrorMessage(error.message || "Failed to toggle camera");
        }
    }, [cam, body, isBodyTracking]);

    const handleToggleBodyTracking = useCallback(async () => {
        setBodyErrorMessage("");
        if (!body) {
            setBodyErrorMessage("Body provider not available.");
            return;
        }

        if (isBodyTracking) {
            body.stopTracking();
            setIsBodyTracking(false);
            setDetectedBodyData(null);
        } else {
            if (!isCameraOn) {
                setBodyErrorMessage(
                    "Camera must be on to start body tracking."
                );
                return;
            }
            if (!videoElementForBody) {
                setBodyErrorMessage(
                    "Video element not yet available for body tracking."
                );
                return;
            }
            if (
                !videoElementForBody.srcObject ||
                !videoElementForBody.srcObject.active
            ) {
                setBodyErrorMessage(
                    "Video element does not have an active stream."
                );
                return;
            }
            try {
                body.startTracking(videoElementForBody);
                // If startTracking itself doesn't set isBodyTracking,
                // we might optimistically set it here,
                // but let's wait for data/error events first as per current design.
            } catch (error) {
                console.error(
                    "Error directly from body.startTracking call:",
                    error
                );
                setBodyErrorMessage(
                    error.message || "Failed to start body tracking."
                );
                setIsBodyTracking(false); // Ensure it's false if start failed
            }
        }
    }, [isCameraOn, videoElementForBody, body, isBodyTracking]);

    return (
        <div className="card-container">
            <h2 className="card-title">Body Provider Demo</h2>
            <div className="camera-view-container">
                <CameraView
                    stream={currentStream}
                    onVideoElementReady={setVideoElementForBody}
                    bodyData={detectedBodyData}
                    showBodies={true}
                />
                {isBodyTracking && detectedBodyData && (
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}>
                        🚶 Bodies Detected: {detectedBodyData.detectedBodies?.length || 0}
                        {detectedBodyData.detectedBodies?.[0]?.landmarks && (
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                Landmarks: {detectedBodyData.detectedBodies[0].landmarks.length} tracked
                            </div>
                        )}
                    </div>
                )}
            </div>
            {cameraErrorMessage && (
                <p className="error-message">
                    Camera Error: {cameraErrorMessage}
                </p>
            )}
            {bodyErrorMessage && (
                <p className="error-message">
                    Body Error: {bodyErrorMessage}
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
                    onClick={handleToggleBodyTracking}
                    disabled={!isCameraOn}
                    title={
                        isBodyTracking
                            ? "Stop Body Tracking"
                            : "Start Body Tracking"
                    }
                >
                    {isBodyTracking ? <UserCheck /> : <User />}
                </button>
                <StatusDot isActive={isBodyTracking} />
            </div>
        </div>
    );
}

export default ProviderDemo;
