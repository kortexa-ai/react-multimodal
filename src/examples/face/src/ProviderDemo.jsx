import { useEffect, useState, useCallback } from "react";
import { Smile, SmilePlus, Video, VideoOff } from "lucide-react";
import { useCamera, useFaceControl } from "../../../index";
import CameraView from "../../common/src/CameraView";
import StatusDot from "../../common/src/StatusDot";

function ProviderDemo() {
    const cam = useCamera();
    const face = useFaceControl();

    const [isCameraOn, setIsCameraOn] = useState(cam?.isRecording || false);
    const [cameraErrorMessage, setCameraErrorMessage] = useState("");
    const [currentStream, setCurrentStream] = useState(null);
    const [videoElementForFace, setVideoElementForFace] = useState(null);

    const [isFaceTracking, setIsFaceTracking] = useState(false);
    const [faceErrorMessage, setFaceErrorMessage] = useState("");
    const [detectedFaceData, setDetectedFaceData] = useState(null);

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
            console.error("Camera Error in Face Demo:", error);
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
        if (!face) return;

        const handleData = (data) => {
            console.log("Face data received:", data);
            setDetectedFaceData(data);
            setIsFaceTracking(true);
            setFaceErrorMessage("");
        };

        const handleError = (error) => {
            console.error("Face error in demo:", error);
            setFaceErrorMessage(error.message || "Face tracking error");
            setIsFaceTracking(false);
        };

        const dataId = face.addFaceDataListener(handleData);
        const errorId = face.addErrorListener(handleError);

        return () => {
            face.removeFaceDataListener(dataId);
            face.removeErrorListener(errorId);
        };
    }, [face]);

    const handleToggleCamera = useCallback(async () => {
        if (!cam) return;
        setCameraErrorMessage("");
        try {
            if (cam.isRecording) {
                if (isFaceTracking && face) {
                    face.stopTracking();
                    setIsFaceTracking(false);
                    setDetectedFaceData(null);
                }
                cam.stop();
            } else {
                cam.start();
            }
        } catch (error) {
            console.error("Failed to toggle camera:", error);
            setCameraErrorMessage(error.message || "Failed to toggle camera");
        }
    }, [cam, face, isFaceTracking]);

    const handleToggleFaceTracking = useCallback(async () => {
        setFaceErrorMessage("");
        if (!face) {
            setFaceErrorMessage("Face provider not available.");
            return;
        }

        if (isFaceTracking) {
            face.stopTracking();
            setIsFaceTracking(false);
            setDetectedFaceData(null);
        } else {
            if (!isCameraOn) {
                setFaceErrorMessage(
                    "Camera must be on to start face tracking."
                );
                return;
            }
            if (!videoElementForFace) {
                setFaceErrorMessage(
                    "Video element not yet available for face tracking."
                );
                return;
            }
            if (
                !videoElementForFace.srcObject ||
                !videoElementForFace.srcObject.active
            ) {
                setFaceErrorMessage(
                    "Video element does not have an active stream."
                );
                return;
            }
            try {
                face.startTracking(videoElementForFace);
                // If startTracking itself doesn't set isFaceTracking,
                // we might optimistically set it here,
                // but let's wait for data/error events first as per current design.
            } catch (error) {
                console.error(
                    "Error directly from face.startTracking call:",
                    error
                );
                setFaceErrorMessage(
                    error.message || "Failed to start face tracking."
                );
                setIsFaceTracking(false); // Ensure it's false if start failed
            }
        }
    }, [isCameraOn, videoElementForFace, face, isFaceTracking]);

    return (
        <div className="card-container">
            <h2 className="card-title">Face Provider Demo</h2>
            <div className="camera-view-container" style={{ position: 'relative' }}>
                <CameraView
                    stream={currentStream}
                    onVideoElementReady={setVideoElementForFace}
                    faceData={detectedFaceData}
                    showFaces={true}
                />
                {isFaceTracking && detectedFaceData && (
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
                        👤 Faces Detected: {detectedFaceData.detectedFaces?.length || 0}
                        {detectedFaceData.detectedFaces?.[0]?.blendshapes && (
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                Expressions: {detectedFaceData.detectedFaces[0].blendshapes.length} detected
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
            {faceErrorMessage && (
                <p className="error-message">
                    Face Error: {faceErrorMessage}
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
                    onClick={handleToggleFaceTracking}
                    disabled={!isCameraOn}
                    title={
                        isFaceTracking
                            ? "Stop Face Tracking"
                            : "Start Face Tracking"
                    }
                >
                    {isFaceTracking ? <SmilePlus /> : <Smile />}
                </button>
                <StatusDot isActive={isFaceTracking} />
            </div>
        </div>
    );
}

export default ProviderDemo;
