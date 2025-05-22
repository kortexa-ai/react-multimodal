import { useEffect, useState, useCallback } from "react";
import { useMediaControl } from "../../../index";
import StatusDot from "../../common/StatusDot";
import { Camera, CameraOff, Mic, MicOff, Play, Square } from "lucide-react";
import CameraView from "../../common/CameraView";
import MicrophoneView from "../../common/MicrophoneView";

const ProviderDemo = () => {
    const [cameraErrorMessage, setCameraErrorMessage] = useState("");
    const [micErrorMessage, setMicErrorMessage] = useState("");

    const media = useMediaControl();

    useEffect(() => {
        if (media?.cam?.error) {
            setCameraErrorMessage(media.cam.error);
        } else {
            setCameraErrorMessage("");
        }
    }, [media?.cam?.error]);

    useEffect(() => {
        if (media?.audio?.error) {
            setMicErrorMessage(media.audio.error);
        } else {
            setMicErrorMessage("");
        }
    }, [media?.audio?.error]);

    const handleToggleCamera = useCallback(async () => {
        setCameraErrorMessage("");
        if (!media.cam) return;
        if (media.cam.isOn) {
            media.cam.stopCamera();
        } else {
            try {
                await media.cam.startCamera();
            } catch (err) {
                setCameraErrorMessage(err.message || "Failed to start camera.");
            }
        }
    }, [media.cam]);

    const handleToggleMicrophone = useCallback(async () => {
        setMicErrorMessage("");
        if (!media.mic || typeof media.mic.isRecording !== "function") return;
        if (media.mic.isRecording()) {
            media.mic.stop();
        } else {
            try {
                await media.mic.start();
            } catch (err) {
                console.error("[MediaDemo] Error calling mic.start():", err);
                setMicErrorMessage(
                    err.message || "Failed to start microphone."
                );
            }
        }
    }, [media.mic]);

    const handleStartAllMedia = useCallback(async () => {
        if (media && media.startMedia) {
            try {
                await media.startMedia();
            } catch (err) {
                console.error("[MediaDemo] Error starting all media:", err);
            }
        }
    }, [media]);

    const handleStopAllMedia = useCallback(() => {
        if (media && media.stopMedia) {
            media.stopMedia();
        }
    }, [media]);

    if (!media) {
        return (
            <div className="card-container">
                <p className="status-text">Loading media controls...</p>
            </div>
        );
    }

    return (
        <div className="card-container">
            <h2 className="card-title">Media Provider Demo</h2>

            <div className="camera-view-container">
                <CameraView stream={media.videoStream} />
            </div>
            {cameraErrorMessage && (
                <p className="error-message">{cameraErrorMessage}</p>
            )}

            <MicrophoneView mic={media.mic} />
            {micErrorMessage && (
                <p className="error-message">{micErrorMessage}</p>
            )}

            <div className="button-row bottom-button-row">
                <button
                    onClick={handleStartAllMedia}
                    disabled={
                        !media || (media.isAudioActive && media.isVideoActive)
                    }
                    title="Start All Media"
                >
                    <Play />
                </button>
                <button
                    onClick={handleStopAllMedia}
                    disabled={
                        !media || (!media.isAudioActive && !media.isVideoActive)
                    }
                    title="Stop All Media"
                >
                    <Square />
                </button>

                <span className="control-separator"></span>

                <button
                    onClick={handleToggleCamera}
                    disabled={!media.cam}
                    title={
                        media.cam && media.cam.isOn
                            ? "Stop Camera"
                            : "Start Camera"
                    }
                >
                    {media.cam && media.cam.isOn ? <CameraOff /> : <Camera />}
                </button>
                {media.cam && <StatusDot isActive={media.cam.isOn} />}

                <span className="control-separator"></span>

                <button
                    onClick={handleToggleMicrophone}
                    disabled={!media.mic}
                    title={
                        media.mic &&
                        typeof media.mic.isRecording === "function" &&
                        media.mic.isRecording()
                            ? "Stop Microphone"
                            : "Start Microphone"
                    }
                >
                    {media.mic &&
                    typeof media.mic.isRecording === "function" &&
                    media.mic.isRecording() ? (
                        <MicOff />
                    ) : (
                        <Mic />
                    )}
                </button>
                {media.mic && <StatusDot isActive={media.mic.isRecording()} />}
            </div>
        </div>
    );
};

export default ProviderDemo;
