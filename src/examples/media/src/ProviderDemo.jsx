import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { useMediaControl } from "../../../index.ts";

const ProviderDemo = () => {
    // Refs and state for Camera Visualization
    const cameraMountRef = useRef(null);
    const cameraSceneRef = useRef(null);
    const cameraViewCameraRef = useRef(null); 
    const cameraRendererRef = useRef(null);
    const videoPlaneRef = useRef(null);
    const videoTextureRef = useRef(null);
    const videoElementRef = useRef(null);
    const cameraAnimationFrameIdRef = useRef(null);
    const [cameraStatusMessage, setCameraStatusMessage] = useState("Camera Idle");
    const [cameraErrorMessage, setCameraErrorMessage] = useState("");

    // Refs and state for Microphone Visualization
    const micMountRef = useRef(null);
    const micSceneRef = useRef(null);
    const micViewCameraRef = useRef(null); 
    const micRendererRef = useRef(null);
    const micBarRef = useRef(null);
    const micAnimationIdRef = useRef(null);
    const micLatestAmplitudeRef = useRef(0);
    const [micStatusMessage, setMicStatusMessage] = useState("Mic Idle");
    const [micErrorMessage, setMicErrorMessage] = useState("");
    const [micLatestAmplitude, setMicLatestAmplitude] = useState(0);

    const media = useMediaControl();
    const cam = media?.cam;
    const mic = media?.mic;

    // Effect for Camera Three.js Setup
    useEffect(() => {
        if (!cameraMountRef.current || !cam || !cam.stream) {
            // If stream is not available, ensure cleanup if resources were previously allocated
            if (cameraRendererRef.current) {
                cameraRendererRef.current.dispose();
                cameraRendererRef.current = null;
            }
            if (cameraAnimationFrameIdRef.current) {
                cancelAnimationFrame(cameraAnimationFrameIdRef.current);
                cameraAnimationFrameIdRef.current = null;
            }
            if (cameraMountRef.current) {
                cameraMountRef.current.innerHTML = ''; // Clear previous canvas
            }
            return;
        }

        const currentMount = cameraMountRef.current;

        // Scene, Camera, Renderer
        cameraSceneRef.current = new THREE.Scene();

        const width = currentMount.clientWidth;
        const height = currentMount.clientHeight;
        cameraViewCameraRef.current = new THREE.OrthographicCamera(
            width / -2, width / 2, height / 2, height / -2, 0.1, 1000
        );
        cameraViewCameraRef.current.position.z = 10;
        cameraViewCameraRef.current.lookAt(cameraSceneRef.current.position);

        cameraRendererRef.current = new THREE.WebGLRenderer({ antialias: true });
        cameraRendererRef.current.setSize(width, height);
        currentMount.appendChild(cameraRendererRef.current.domElement);

        // Video Texture
        videoElementRef.current = document.createElement('video');
        videoElementRef.current.srcObject = cam.stream;
        videoElementRef.current.autoplay = true;
        videoElementRef.current.muted = true; // Important for autoplay
        videoElementRef.current.playsInline = true;
        videoElementRef.current.play().catch(e => {
            if (e.name !== 'AbortError') {
                console.error("Error playing video for texture:", e);
            }
        });

        videoTextureRef.current = new THREE.VideoTexture(videoElementRef.current);
        videoTextureRef.current.minFilter = THREE.LinearFilter;
        videoTextureRef.current.magFilter = THREE.LinearFilter;

        const planeGeometry = new THREE.PlaneGeometry(width, height);
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: videoTextureRef.current,
        });
        videoPlaneRef.current = new THREE.Mesh(planeGeometry, planeMaterial);
        cameraSceneRef.current.add(videoPlaneRef.current);

        // Animation Loop
        const animateCamera = () => {
            cameraAnimationFrameIdRef.current = requestAnimationFrame(animateCamera);
            if (videoTextureRef.current && videoElementRef.current) {
                if (
                    videoElementRef.current.readyState >= videoElementRef.current.HAVE_METADATA &&
                    !videoElementRef.current.paused &&
                    videoElementRef.current.videoWidth > 0 &&
                    videoElementRef.current.videoHeight > 0
                ) {
                    videoTextureRef.current.needsUpdate = true;
                }
            }
            if (cameraRendererRef.current && cameraSceneRef.current && cameraViewCameraRef.current) {
                cameraRendererRef.current.render(cameraSceneRef.current, cameraViewCameraRef.current);
            }
        };
        animateCamera();

        // Handle window resize
        const handleCameraResize = () => {
            if (cameraRendererRef.current && cameraViewCameraRef.current && currentMount) {
                const newWidth = currentMount.clientWidth;
                const newHeight = currentMount.clientHeight;
                cameraRendererRef.current.setSize(newWidth, newHeight);

                cameraViewCameraRef.current.left = newWidth / -2;
                cameraViewCameraRef.current.right = newWidth / 2;
                cameraViewCameraRef.current.top = newHeight / 2;
                cameraViewCameraRef.current.bottom = newHeight / -2;
                cameraViewCameraRef.current.updateProjectionMatrix();
                if (videoPlaneRef.current && videoPlaneRef.current.geometry) {
                    videoPlaneRef.current.geometry.dispose(); // Dispose old geometry
                    videoPlaneRef.current.geometry = new THREE.PlaneGeometry(newWidth, newHeight);
                }
            }
        };
        window.addEventListener('resize', handleCameraResize);

        return () => {
            if (cameraAnimationFrameIdRef.current) {
                cancelAnimationFrame(cameraAnimationFrameIdRef.current);
            }
            if (videoElementRef.current) {
                videoElementRef.current.pause();
                videoElementRef.current.srcObject = null;
            }
            if (videoTextureRef.current) {
                videoTextureRef.current.dispose();
            }
            if (videoPlaneRef.current) {
                if (videoPlaneRef.current.geometry) videoPlaneRef.current.geometry.dispose();
                if (videoPlaneRef.current.material) videoPlaneRef.current.material.dispose();
            }
            if (cameraRendererRef.current) {
                cameraRendererRef.current.dispose();
                cameraRendererRef.current = null;
            }
            if (currentMount) {
                currentMount.innerHTML = ''; // Clear the canvas
            }
            window.removeEventListener('resize', handleCameraResize);
        };
    }, [cam, cam?.stream]); // Re-run if cam object or stream changes

    // Effect for Camera Listeners
    useEffect(() => {
        if (!cam) return;

        if (cam.stream && videoElementRef.current) {
            videoElementRef.current.srcObject = cam.stream;
            videoElementRef.current.play().catch(e => {
                if (e.name !== 'AbortError') {
                    console.error("Error playing local video:", e);
                }
            });
        } else if (!cam.stream && videoElementRef.current) {
            videoElementRef.current.srcObject = null;
        }

        const handleCameraError = (err) => {
            console.error("Camera Error:", err);
            setCameraErrorMessage(typeof err === 'string' ? err : (err && err.message) || "Unknown camera error");
            setCameraStatusMessage("Camera Error");
        };

        const handleCameraStarted = () => {
            setCameraStatusMessage("Camera Active");
            if (videoElementRef.current && videoElementRef.current.srcObject) {
                videoElementRef.current.play().catch(e => {
                    if (e.name !== 'AbortError') {
                        console.error("Error playing local video in handleCameraStarted:", e);
                    }
                });
            }
        };

        const handleCameraStopped = () => {
            setCameraStatusMessage("Camera Stopped");
        };

        const errorListenerId = cam.addErrorListener(handleCameraError);
        const startedListenerId = cam.addStartedListener(handleCameraStarted);
        const stoppedListenerId = cam.addStoppedListener(handleCameraStopped);

        setCameraStatusMessage(cam.isOn ? "Camera Active" : "Camera Idle");
        
        if (cam.isOn && cam.stream && videoElementRef.current && !videoElementRef.current.srcObject) {
            videoElementRef.current.srcObject = cam.stream;
            videoElementRef.current.play().catch(e => {
                if (e.name !== 'AbortError') {
                    console.error("Error playing local video on initial ON state:", e);
                }
            });
        }

        return () => {
            if (cam.removeErrorListener) cam.removeErrorListener(errorListenerId);
            if (cam.removeStartedListener) cam.removeStartedListener(startedListenerId);
            if (cam.removeStoppedListener) cam.removeStoppedListener(stoppedListenerId);
        };
    }, [cam]);

    // Effect for Microphone Three.js Setup
    useEffect(() => {
        if (!micMountRef.current || !mic) {
             // If mic is not available, ensure cleanup if resources were previously allocated
            if (micRendererRef.current) {
                micRendererRef.current.dispose();
                micRendererRef.current = null;
            }
            if (micAnimationIdRef.current) {
                cancelAnimationFrame(micAnimationIdRef.current);
                micAnimationIdRef.current = null;
            }
            if (micMountRef.current) {
                micMountRef.current.innerHTML = ''; // Clear previous canvas
            }
            return;
        }

        const currentMicMount = micMountRef.current;

        // Scene, Camera, Renderer
        micSceneRef.current = new THREE.Scene();
        micSceneRef.current.background = new THREE.Color(0x222222);

        const micWidth = currentMicMount.clientWidth;
        const micHeight = currentMicMount.clientHeight;

        micViewCameraRef.current = new THREE.PerspectiveCamera(75, micWidth / micHeight, 0.1, 1000);
        micViewCameraRef.current.position.z = 5;

        micRendererRef.current = new THREE.WebGLRenderer({ antialias: true });
        micRendererRef.current.setSize(micWidth, micHeight);
        micRendererRef.current.setClearColor(0x000000, 0); // Transparent background
        currentMicMount.appendChild(micRendererRef.current.domElement);

        // Bar Mesh for amplitude
        const barGeometry = new THREE.BoxGeometry(1, 0.1, 1); // Initial height very small
        const barMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        micBarRef.current = new THREE.Mesh(barGeometry, barMaterial);
        micBarRef.current.position.y = -0.5; 
        micSceneRef.current.add(micBarRef.current);

        // Animation Loop
        const animateMic = () => {
            micAnimationIdRef.current = requestAnimationFrame(animateMic);
            if (micBarRef.current) {
                const targetScale = Math.max(0.01, micLatestAmplitudeRef.current * 10);
                micBarRef.current.scale.y = THREE.MathUtils.lerp(
                    micBarRef.current.scale.y,
                    targetScale,
                    0.1
                );
                micBarRef.current.position.y = micBarRef.current.scale.y / 2 - 0.5;
            }
            if (micRendererRef.current && micSceneRef.current && micViewCameraRef.current) {
                micRendererRef.current.render(micSceneRef.current, micViewCameraRef.current);
            }
        };
        animateMic();

        // Handle window resize
        const handleMicResize = () => {
            if (micRendererRef.current && micViewCameraRef.current && currentMicMount) {
                const newWidth = currentMicMount.clientWidth;
                const newHeight = currentMicMount.clientHeight;
                micRendererRef.current.setSize(newWidth, newHeight);
                micViewCameraRef.current.aspect = newWidth / newHeight;
                micViewCameraRef.current.updateProjectionMatrix();
            }
        };
        window.addEventListener('resize', handleMicResize);

        return () => {
            if (micAnimationIdRef.current) {
                cancelAnimationFrame(micAnimationIdRef.current);
            }
            if (micBarRef.current) {
                if (micBarRef.current.geometry) micBarRef.current.geometry.dispose();
                if (micBarRef.current.material) micBarRef.current.material.dispose();
            }
            if (micRendererRef.current) {
                micRendererRef.current.dispose();
                micRendererRef.current = null;
            }
            if (currentMicMount) {
                currentMicMount.innerHTML = ''; // Clear the canvas
            }
            window.removeEventListener('resize', handleMicResize);
        };
    }, [mic]); // Re-run if mic object changes

    // Effect to update mic amplitude ref
    useEffect(() => {
        micLatestAmplitudeRef.current = micLatestAmplitude;
    }, [micLatestAmplitude]);

    // Effect for Microphone Listeners
    useEffect(() => {
        if (!mic || typeof mic.isRecording !== 'function') return;

        const handleMicData = (audioData) => {
            let sum = 0;
            for (let i = 0; i < audioData.length; i++) {
                sum += Math.abs(audioData[i]);
            }
            const avgAmplitude = audioData.length > 0 ? sum / audioData.length : 0;
            setMicLatestAmplitude(avgAmplitude);
        };

        const handleMicError = (err) => {
            console.error("[MediaDemo] Mic Error Listener:", err);
            setMicErrorMessage(err || "An unknown microphone error occurred.");
            setMicStatusMessage("Mic Error");
        };

        const handleMicStart = () => {
            setMicStatusMessage("Recording...");
        }
        const handleMicStop = () => {
            setMicStatusMessage("Mic Stopped");
        }

        const dataListenerId = mic.addAudioDataListener(handleMicData);
        const errorListenerId = mic.addErrorListener(handleMicError);
        const startListenerId = mic.addStartListener(handleMicStart);
        const stopListenerId = mic.addStopListener(handleMicStop);

        setMicStatusMessage(mic.isRecording() ? "Recording..." : "Mic Idle");

        return () => {
            if (mic.removeAudioDataListener) mic.removeAudioDataListener(dataListenerId);
            if (mic.removeErrorListener) mic.removeErrorListener(errorListenerId);
            if (mic.removeStartListener) mic.removeStartListener(startListenerId);
            if (mic.removeStopListener) mic.removeStopListener(stopListenerId);
        };
    }, [mic, setMicLatestAmplitude]); 


    const handleToggleCamera = useCallback(async () => {
        setCameraErrorMessage("");
        if (!cam) return;
        if (cam.isOn) {
            cam.stopCamera();
        } else {
            try {
                await cam.startCamera();
            } catch (err) {
                setCameraErrorMessage(err.message || "Failed to start camera.");
                setCameraStatusMessage("Camera Error");
            }
        }
    }, [cam]);

    const handleFlipCamera = useCallback(async () => {
        if (!cam || !cam.isOn) return;
        try {
            await cam.flipCamera();
        } catch (err) {
            setCameraErrorMessage(err.message || "Failed to flip camera.");
        }
    }, [cam]);

    const handleToggleMicrophone = useCallback(async () => {
        setMicErrorMessage("");
        if (!mic || typeof mic.isRecording !== 'function') return;
        if (mic.isRecording()) {
            mic.stop();
        } else {
            try {
                await mic.start();
            } catch (err) {
                console.error("[MediaDemo] Error calling mic.start():", err);
                setMicErrorMessage(err.message || "Failed to start microphone.");
                setMicStatusMessage("Mic Error");
            }
        }
    }, [mic]);

    const handleStartAllMedia = useCallback(async () => {
        if (media && media.startMedia) {
            try {
                await media.startMedia();
            } catch (err) {
                // Handle or display error appropriately
                console.error("[MediaDemo] Error starting all media:", err);
            }
        }
    }, [media]);

    const handleStopAllMedia = useCallback(() => {
        if (media && media.stopMedia) {
            media.stopMedia();
        }
    }, [media]);

    const handleToggleAllMedia = useCallback(async () => {
        if (media && media.toggleMedia) {
            try {
                await media.toggleMedia();
            } catch (err) {
                console.error("[MediaDemo] Error toggling all media:", err);
            }
        }
    }, [media]);

    if (!media) {
        return <div>Loading media controls...</div>;
    }

    return (
        <div>
            <h2>Media Provider Demo</h2>

            {/* Combined Media Controls */}
            <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #555' }}>
                <h3>Combined Media Controls</h3>
                <button onClick={handleStartAllMedia} disabled={!media || (media.isAudioActive && media.isVideoActive)}>
                    Start All Media
                </button>
                <button onClick={handleStopAllMedia} disabled={!media || (!media.isAudioActive && !media.isVideoActive)}>
                    Stop All Media
                </button>
                <button onClick={handleToggleAllMedia} disabled={!media}>
                    Toggle All Media
                </button>
                {media.mediaError && <div className="error" style={{color: 'red', marginTop: '10px'}}>Media Error: {media.mediaError}</div>}
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                {/* Camera Section */}
                <div style={{ flex: 2 }}>
                    <h3>Camera Feed</h3>
                    <div
                        ref={cameraMountRef}
                        style={{
                            width: "100%",
                            height: "300px",
                            backgroundColor: "#000", 
                            borderRadius: "4px",
                            border: "1px solid #444"
                        }}
                    >
                        {/* Camera Three.js canvas will be appended here */}
                    </div>
                    <button onClick={handleToggleCamera} disabled={!cam}>
                        {cam && cam.isOn ? "Stop Camera" : "Start Camera"}
                    </button>
                    <button
                        onClick={handleFlipCamera}
                        disabled={!cam || !cam.isOn}
                    >
                        Flip Camera
                    </button>
                    <br />
                    <span className="status">Camera Status: {cameraStatusMessage}</span>
                    {cameraErrorMessage && <div className="error" style={{color: 'red'}}>Error: {cameraErrorMessage}</div>}
                </div>

                {/* Microphone Section */}
                <div style={{ flex: 1 }}>
                    <h3>Microphone Amplitude</h3>
                    <div
                        ref={micMountRef}
                        style={{
                            width: "100%",
                            height: "300px",
                            backgroundColor: "#111",
                            borderRadius: "4px",
                            border: "1px solid #444"
                        }}
                    >
                        {/* Microphone Three.js canvas will be appended here */}
                    </div>
                    <button onClick={handleToggleMicrophone} disabled={!mic}>
                        {mic && typeof mic.isRecording === 'function' && mic.isRecording() ? "Stop Microphone" : "Start Microphone"}
                    </button>
                    <br />
                    <span className="status">Mic Status: {micStatusMessage}</span>
                    {micErrorMessage && <div className="error" style={{color: 'red'}}>Error: {micErrorMessage}</div>}
                </div>
            </div>
        </div>
    );
};

export default ProviderDemo;
