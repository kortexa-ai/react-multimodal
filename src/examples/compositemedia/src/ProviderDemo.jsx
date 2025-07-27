/*
PROVIDER DEMO UI BEHAVIOR (Buttons & State Indicators):

This demo showcases the CompositeMediaProvider's capabilities with Camera and Hands tracking.
The UI elements (buttons, status indicators) should reflect and control the state of these providers according to the following rules:

1.  **Global Start/Stop Buttons (CompositeMediaProvider master controls):**
    *   **Global Stop Button:**
        *   Enabled: If *any* media provider (Camera or Hands) is currently running.
        *   Disabled: If *all* media providers are stopped.
    *   **Global Start Button:**
        *   Enabled: If *any* media provider (Camera or Hands) is currently stopped.
        *   Disabled: If *all* media providers are currently running.

2.  **Individual Provider Toggle Buttons & Status Indicators:**
    *   **General Behavior:** Each toggle button should allow the user to start the provider if it's stopped, or stop it if it's running. The status indicator should clearly show the current state (e.g., "Running," "Stopped," "Error").
    *   **Camera Toggle:**
        *   Always enabled (assuming a camera device is available).
        *   Controls the start/stop state of the Camera provider.
    *   **Microphone Toggle (if applicable, though not the primary focus here):**
        *   Always enabled (assuming a microphone device is available).
        *   Controls the start/stop state of the Microphone provider.
    *   **Hands Tracking Toggle:**
        *   Enabled: Only if the Camera provider is currently running (as Hands tracking depends on the camera's video stream).
        *   Disabled: If the Camera provider is stopped.
        *   Controls the start/stop state of the Hands tracking provider.

3.  **Visualization:**
    *   The demo includes visualization for Camera (video feed via Three.js) and Hands (landmark overlay on the camera feed).
    *   These visualizations should update dynamically based on the data from their respective providers.
    *   Starting/stopping Hands tracking (while the camera is on) should not cause the camera visualization to reset or flicker.
*/

import { useCallback } from "react";
import {
    Camera,
    CameraOff,
    Mic,
    MicOff,
    Play,
    Square,
    Hand,
    HandMetal,
    User,
    UserCheck,
    Smile,
    SmilePlus,
} from "lucide-react";
import { useCompositeMedia } from "../../../index";
import MicrophoneView from "../../common/src/MicrophoneView";
import CameraView from "../../common/src/CameraView";
import StatusDot from "../../common/src/StatusDot";

function ProviderDemo() {
    const media = useCompositeMedia();

    // Extract setVideoElement functions to stabilize the callback's dependencies
    const setVideoElementForHands = media?.setVideoElementForHands;
    const setVideoElementForBody = media?.setVideoElementForBody;
    const setVideoElementForFace = media?.setVideoElementForFace;

    const handleVideoElementReady = useCallback(
        (element) => {
            if (setVideoElementForHands) {
                setVideoElementForHands(element);
            }
            if (setVideoElementForBody) {
                setVideoElementForBody(element);
            }
            if (setVideoElementForFace) {
                setVideoElementForFace(element);
            }
        },
        [setVideoElementForHands, setVideoElementForBody, setVideoElementForFace]
    );

    const handleToggleCamera = useCallback(async () => {
        if (!media.cam) return;
        if (media.cam.isRecording) {
            media.cam.stop();
        } else {
            try {
                await media.cam.start();
            } catch (err) {
                console.error("[MediaDemo] Error toggling camera:", err);
            }
        }
    }, [media.cam]);

    const handleToggleMicrophone = useCallback(async () => {
        if (!media.mic) return;
        if (media.mic.isRecording) {
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

    const handleToggleHands = useCallback(async () => {
        if (!media.hands) return;
        if (media.isHandTrackingActive) {
            media.stopHands();
        } else {
            try {
                await media.startHands();
            } catch (err) {
                // Error should be displayed via media.handsError
                console.error("[MediaDemo] Error toggling hand tracking:", err);
            }
        }
    }, [media]);

    const handleToggleBody = useCallback(async () => {
        if (!media.body) return;
        if (media.isBodyTrackingActive) {
            media.stopBody();
        } else {
            try {
                await media.startBody();
            } catch (err) {
                // Error should be displayed via media.bodyError
                console.error("[MediaDemo] Error toggling body tracking:", err);
            }
        }
    }, [media]);

    const handleToggleFace = useCallback(async () => {
        if (!media.face) return;
        if (media.isFaceTrackingActive) {
            media.stopFace();
        } else {
            try {
                await media.startFace();
            } catch (err) {
                // Error should be displayed via media.faceError
                console.error("[MediaDemo] Error toggling face tracking:", err);
            }
        }
    }, [media]);

    if (!media) {
        return (
            <div className="card-container">
                <p className="status-text">
                    Loading composite media controls...
                </p>
            </div>
        );
    }

    return (
        <div className="card-container">
            <h2 className="card-title">Composite Media Provider Demo</h2>

            <div className="camera-view-container" style={{ position: 'relative' }}>
                <CameraView
                    stream={media.videoStream}
                    onVideoElementReady={handleVideoElementReady}
                    handsData={media.currentHandsData}
                    faceData={media.currentFaceData}
                    bodyData={media.currentBodyData}
                    showHands={media.isHandTrackingActive}
                    showFaces={media.isFaceTrackingActive}
                    showBodies={media.isBodyTrackingActive}
                />
                {/* Multi-tracking indicators */}
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    {media.isHandTrackingActive && media.currentHandsData && (
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }}>
                            ✋ Hands: {media.currentHandsData.detectedHands?.length || 0}
                        </div>
                    )}
                    {media.isFaceTrackingActive && media.currentFaceData && (
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }}>
                            👤 Faces: {media.currentFaceData.detectedFaces?.length || 0}
                        </div>
                    )}
                    {media.isBodyTrackingActive && media.currentBodyData && (
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }}>
                            🚶 Bodies: {media.currentBodyData.detectedBodies?.length || 0}
                        </div>
                    )}
                </div>
            </div>
            {media.videoError && (
                <p className="error-message">
                    Camera Error: {media.videoError}
                </p>
            )}
            {media.audioError && (
                <p className="error-message">Mic Error: {media.audioError}</p>
            )}
            {media.handsError && (
                <p className="error-message">Hands Error: {media.handsError}</p>
            )}
            {media.bodyError && (
                <p className="error-message">Body Error: {media.bodyError}</p>
            )}
            {media.faceError && (
                <p className="error-message">Face Error: {media.faceError}</p>
            )}
            {media.mediaError && (
                <p className="error-message">Media Error: {media.mediaError}</p>
            )}

            <MicrophoneView mic={media.mic} />

            <div className="button-row bottom-button-row">
                <button
                    onClick={handleStartAllMedia}
                    disabled={
                        !media ||
                        (media.isAudioActive &&
                            media.isVideoActive &&
                            media.isHandTrackingActive &&
                            media.isBodyTrackingActive &&
                            media.isFaceTrackingActive)
                    }
                    title="Start All Media"
                >
                    <Play />
                </button>
                <button
                    onClick={handleStopAllMedia}
                    disabled={
                        !media ||
                        (!media.isAudioActive &&
                            !media.isVideoActive &&
                            !media.isHandTrackingActive &&
                            !media.isBodyTrackingActive &&
                            !media.isFaceTrackingActive)
                    }
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
                    title={
                        media.isAudioActive
                            ? "Stop Microphone"
                            : "Start Microphone"
                    }
                >
                    {media.isAudioActive ? <MicOff /> : <Mic />}
                </button>
                {media.mic && <StatusDot isActive={media.isAudioActive} />}

                <span className="control-separator"></span>
                {/* Hand tracking toggle button */}
                <button
                    onClick={handleToggleHands}
                    disabled={
                        !media.hands ||
                        !media.isVideoActive ||
                        !media.isVideoElementForHandsSet ||
                        media.isStartingHands
                    }
                    title={
                        media.isHandTrackingActive
                            ? "Stop Hand Tracking"
                            : "Start Hand Tracking"
                    }
                >
                    {media.isHandTrackingActive ? <HandMetal /> : <Hand />}
                </button>
                {media.hands && (
                    <StatusDot isActive={media.isHandTrackingActive} />
                )}

                <span className="control-separator"></span>
                {/* Body tracking toggle button */}
                <button
                    onClick={handleToggleBody}
                    disabled={
                        !media.body ||
                        !media.isVideoActive ||
                        !media.isVideoElementForBodySet ||
                        media.isStartingBody
                    }
                    title={
                        media.isBodyTrackingActive
                            ? "Stop Body Tracking"
                            : "Start Body Tracking"
                    }
                >
                    {media.isBodyTrackingActive ? <UserCheck /> : <User />}
                </button>
                {media.body && (
                    <StatusDot isActive={media.isBodyTrackingActive} />
                )}

                <span className="control-separator"></span>
                {/* Face tracking toggle button */}
                <button
                    onClick={handleToggleFace}
                    disabled={
                        !media.face ||
                        !media.isVideoActive ||
                        !media.isVideoElementForFaceSet ||
                        media.isStartingFace
                    }
                    title={
                        media.isFaceTrackingActive
                            ? "Stop Face Tracking"
                            : "Start Face Tracking"
                    }
                >
                    {media.isFaceTrackingActive ? <SmilePlus /> : <Smile />}
                </button>
                {media.face && (
                    <StatusDot isActive={media.isFaceTrackingActive} />
                )}
            </div>
        </div>
    );
}

export default ProviderDemo;
