import { useCallback } from "react";
import { Camera, CameraOff, Mic, MicOff, Play, Square, Hand } from "lucide-react";
import { useMediaControl } from "../../../index";
import MicrophoneView from "../../common/src/MicrophoneView";
import CameraView from "../../common/src/CameraView";
import StatusDot from "../../common/src/StatusDot";

function ProviderDemo() {
    const media = useMediaControl();

    // Extract setVideoElementForHands to stabilize the callback's dependency
    const setVideoElementForHands = media?.setVideoElementForHands;

    const handleVideoElementReady = useCallback((element) => {
        if (setVideoElementForHands) {
            setVideoElementForHands(element);
        }
    }, [setVideoElementForHands]);

    const handleToggleCamera = useCallback(async () => {
        if (!media.cam) return;
        if (media.cam.isOn) {
            media.cam.stopCamera();
        } else {
            try {
                await media.cam.startCamera();
            } catch (err) {
                console.error("[MediaDemo] Error toggling camera:", err);
            }
        }
    }, [media.cam]);

    const handleToggleMicrophone = useCallback(async () => {
        if (!media.mic || typeof media.mic.isRecording !== "function") return;
        if (media.mic.isRecording()) {
            media.mic.stop();
        } else {
            try {
                await media.mic.start();
            } catch (err) {
                console.error("[MediaDemo] Error toggling microphone:", err);
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
                <CameraView
                    stream={media.videoStream}
                    onVideoElementReady={handleVideoElementReady}
                    handsData={media.currentHandsData}
                    showHands={media.isHandTrackingActive}
                />
            </div>
            {media.videoError && (
                <p className="error-message">Camera Error: {media.videoError}</p>
            )}
            {media.audioError && (
                <p className="error-message">Mic Error: {media.audioError}</p>
            )}
            {media.handsError && (
                <p className="error-message">Hands Error: {media.handsError}</p>
            )}
            {media.mediaError && (
                <p className="error-message">Media Error: {media.mediaError}</p>
            )}

            <MicrophoneView mic={media.mic} />

            <div className="button-row bottom-button-row">
                <button
                    onClick={handleStartAllMedia}
                    disabled={!media || (media.isAudioActive && media.isVideoActive && media.isHandTrackingActive)}
                    title="Start All Media"
                >
                    <Play />
                </button>
                <button
                    onClick={handleStopAllMedia}
                    disabled={!media || (!media.isAudioActive && !media.isVideoActive && !media.isHandTrackingActive)}
                    title="Stop All Media"
                >
                    <Square />
                </button>

                <span className="control-separator"></span>

                <button
                    onClick={handleToggleCamera}
                    disabled={!media.cam}
                    title={media.isVideoActive ? "Stop Camera" : "Start Camera"}
                >
                    {media.isVideoActive ? <CameraOff /> : <Camera />}
                </button>
                {media.cam && <StatusDot isActive={media.isVideoActive} />}

                <span className="control-separator"></span>

                <button
                    onClick={handleToggleMicrophone}
                    disabled={!media.mic}
                    title={media.isAudioActive ? "Stop Microphone" : "Start Microphone"}
                >
                    {media.isAudioActive ? <MicOff /> : <Mic />}
                </button>
                {media.mic && <StatusDot isActive={media.isAudioActive} />}

                <span className="control-separator"></span>
                <Hand size={20} />
                {media.hands && <StatusDot isActive={media.isHandTrackingActive} />}
            </div>
        </div>
    );
};

export default ProviderDemo;
