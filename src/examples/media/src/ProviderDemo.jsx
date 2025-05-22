import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { useMediaControl } from "../../../index.ts";
import StatusDot from '../../common/StatusDot';

const ProviderDemo = () => {
    // Refs and state for Camera Visualization
    const cameraMountRef = useRef(null);
    const [cameraErrorMessage, setCameraErrorMessage] = useState("");

    // Refs and state for Microphone Visualization
    const micMountRef = useRef(null);
    const [micErrorMessage, setMicErrorMessage] = useState("");

    const media = useMediaControl();
    const cam = media?.cam;
    const mic = media?.mic;

    // Effect for Camera Visualization
    useEffect(() => {
        if (!cameraMountRef.current || !media || !media.cam) return;

        const currentMount = cameraMountRef.current;
        currentMount.innerHTML = ""; // Clear previous renderer

        const videoElement = document.createElement('video');
        videoElement.setAttribute('playsinline', '');
        videoElement.setAttribute('webkit-playsinline', '');
        videoElement.muted = true;
        videoElement.autoplay = true;

        let scene, camera, renderer, videoTexture, videoPlane, animationFrameId;

        const initThreeJS = (stream) => {
            if (!currentMount) return; // Ensure mount point is still there
            currentMount.innerHTML = ""; // Clear again just in case

            videoElement.srcObject = stream;
            videoElement.play().catch(e => console.error("Error playing video element:", e));

            const width = currentMount.clientWidth;
            const height = currentMount.clientHeight;

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            camera.position.z = 1;

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(width, height);
            currentMount.appendChild(renderer.domElement);

            videoTexture = new THREE.VideoTexture(videoElement);
            const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
            const planeHeight = 1;
            const planeWidth = planeHeight * videoAspect;

            const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
            const material = new THREE.MeshBasicMaterial({ map: videoTexture });
            videoPlane = new THREE.Mesh(geometry, material);
            scene.add(videoPlane);

            camera.lookAt(videoPlane.position);

            const animate = () => {
                animationFrameId = requestAnimationFrame(animate);
                if (videoTexture) videoTexture.needsUpdate = true;
                renderer.render(scene, camera);
            };
            animate();
        };

        const handleStreamChange = (stream) => {
            if (stream) {
                if (!renderer) { // If Three.js isn't initialized yet
                    initThreeJS(stream);
                } else { // If already initialized, just update srcObject
                    videoElement.srcObject = stream;
                    videoElement.play().catch(e => console.error("Error playing video element on stream change:", e));
                }
            } else {
                // Cleanup Three.js if stream is removed
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                if (videoElement.srcObject) {
                    const tracks = videoElement.srcObject.getTracks();
                    tracks.forEach(track => track.stop());
                    videoElement.srcObject = null;
                }
                if (renderer && renderer.domElement && currentMount.contains(renderer.domElement)) {
                    currentMount.removeChild(renderer.domElement);
                }
                if (videoTexture) videoTexture.dispose();
                if (videoPlane && videoPlane.geometry) videoPlane.geometry.dispose();
                if (videoPlane && videoPlane.material) videoPlane.material.dispose();
                if (renderer) renderer.dispose();
                scene = camera = renderer = videoTexture = videoPlane = null;
                currentMount.innerHTML = "Camera feed stopped"; // Placeholder
            }
        };

        // Initial setup if stream is already available
        if (media.cam.stream) {
            initThreeJS(media.cam.stream);
        }

        const streamListenerId = media.cam.addStreamChangedListener(handleStreamChange);
        const errorListenerId = media.cam.addErrorListener((error) => {
            console.error("Camera Error in Media Example:", error);
            // Optionally display this error in the UI
        });

        const handleResize = () => {
            if (camera && renderer && currentMount) {
                const newWidth = currentMount.clientWidth;
                const newHeight = currentMount.clientHeight;
                camera.aspect = newWidth / newHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(newWidth, newHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            media.cam.removeStreamChangedListener(streamListenerId);
            media.cam.removeErrorListener(errorListenerId);
            window.removeEventListener('resize', handleResize);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (videoElement.srcObject) {
                 const tracks = videoElement.srcObject.getTracks();
                 tracks.forEach(track => track.stop());
                 videoElement.srcObject = null;
            }
            if (renderer && renderer.domElement && currentMount.contains(renderer.domElement)) {
                currentMount.removeChild(renderer.domElement);
            }
            if (videoTexture) videoTexture.dispose();
            if (videoPlane && videoPlane.geometry) videoPlane.geometry.dispose();
            if (videoPlane && videoPlane.material) videoPlane.material.dispose();
            if (renderer) renderer.dispose();
        };
    }, [media, media?.cam]); // Depend on media.cam

    // Effect for Microphone Visualization
    useEffect(() => {
        if (!micMountRef.current || !media || !media.mic) return;

        const currentMount = micMountRef.current;
        currentMount.innerHTML = ""; // Clear previous renderer

        let scene, camera, renderer, bar, animationFrameId;

        const initThreeJS = () => {
            const width = currentMount.clientWidth;
            const height = currentMount.clientHeight;

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            camera.position.set(0, 0, 2.5); // Adjusted camera position

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(width, height);
            renderer.setClearColor(0x000000, 0); // Transparent background
            currentMount.appendChild(renderer.domElement);

            const geometry = new THREE.BoxGeometry(1, 0.1, 1); // Initial small height
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            bar = new THREE.Mesh(geometry, material);
            scene.add(bar);

            const animate = () => {
                animationFrameId = requestAnimationFrame(animate);
                renderer.render(scene, camera);
            };
            animate();
        };

        initThreeJS(); // Initialize Three.js scene immediately

        const handleAudioData = (data) => {
            if (bar && data && data.length > 0) {
                let sumSquares = 0.0;
                for (const amplitude of data) {
                    sumSquares += amplitude * amplitude;
                }
                const rms = Math.sqrt(sumSquares / data.length);
                const maxHeight = 5; // Max height of the bar
                const newHeight = Math.min(Math.max(0.1, rms * maxHeight * 20), maxHeight); // Scale and clamp height
                
                bar.scale.y = newHeight / 0.1; // Scale based on initial geometry height of 0.1
                bar.position.y = (newHeight / 2) - (0.1 / 2); // Adjust position based on new height and initial geometry center
            }
        };

        const audioDataListenerId = media.mic.addAudioDataListener(handleAudioData);
        const errorListenerId = media.mic.addErrorListener((error) => {
            console.error("Microphone Error in Media Example:", error);
            // Optionally display this error in the UI
        });

        const handleResize = () => {
            if (camera && renderer && currentMount) {
                const newWidth = currentMount.clientWidth;
                const newHeight = currentMount.clientHeight;
                camera.aspect = newWidth / newHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(newWidth, newHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            media.mic.removeAudioDataListener(audioDataListenerId);
            media.mic.removeErrorListener(errorListenerId);
            window.removeEventListener('resize', handleResize);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (renderer && renderer.domElement && currentMount.contains(renderer.domElement)) {
                currentMount.removeChild(renderer.domElement);
            }
            if (bar && bar.geometry) bar.geometry.dispose();
            if (bar && bar.material) bar.material.dispose();
            if (renderer) renderer.dispose();
        };
    }, [media, media?.mic]); // Depend on media.mic

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
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '650px', margin: '20px auto', backgroundColor: '#f9f9f9' }}>
            {/* Combined Media Controls */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}> 
                <button onClick={handleStartAllMedia} disabled={!media || (media.isAudioActive && media.isVideoActive)} style={{ marginRight: '10px' }}>
                    Start All Media
                </button>
                <button onClick={handleStopAllMedia} disabled={!media || (!media.isAudioActive && !media.isVideoActive)} style={{ marginRight: '10px' }}>
                    Stop All Media
                </button>
                <button onClick={handleToggleAllMedia} disabled={!media}>
                    Toggle All Media
                </button>
                {media.mediaError && <div className="error" style={{color: 'red', marginTop: '10px'}}>Media Error: {media.mediaError}</div>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}> 
                {/* Camera Section */}
                <div style={{ width: '400px', height: '300px', border: '1px solid #ccc', marginRight: '10px', display: 'flex', flexDirection: 'column' }}> 
                    <div ref={cameraMountRef} style={{ width: '100%', flexGrow: 1, backgroundColor: '#000' }}></div> {/* Canvas takes available space */}
                    <div style={{ padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '5px' /* Gap above buttons */ }}>
                        <button onClick={handleToggleCamera} disabled={!cam} style={{ marginRight: '5px' }}>
                            {cam && cam.isOn ? "Stop Camera" : "Start Camera"}
                        </button>
                        <button onClick={handleFlipCamera} disabled={!cam || !cam.isOn} style={{ marginRight: '5px' }}>
                            Flip Camera
                        </button>
                        {cam && <StatusDot isActive={cam.isOn} />}
                    </div>
                    {cameraErrorMessage && <div className="error" style={{color: 'red', marginTop: '5px', textAlign: 'center'}}>{cameraErrorMessage}</div>}
                </div>

                {/* Microphone Section */}
                <div style={{ width: '200px', height: '300px', border: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}> 
                    <div ref={micMountRef} style={{ width: '100%', flexGrow: 1, backgroundColor: '#111' }}></div> {/* Canvas takes available space */}
                    <div style={{ padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '5px' /* Gap above buttons */ }}>
                        <button onClick={handleToggleMicrophone} disabled={!mic} style={{ marginRight: '5px' }}>
                            {mic && typeof mic.isRecording === 'function' && mic.isRecording() ? "Stop Microphone" : "Start Microphone"}
                        </button>
                        {mic && <StatusDot isActive={mic.isRecording()} />}
                    </div>
                    {micErrorMessage && <div className="error" style={{color: 'red', marginTop: '5px', textAlign: 'center'}}>{micErrorMessage}</div>}
                </div>
            </div>
        </div>
    );
};

export default ProviderDemo;
