import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { useCameraControl } from "../../../index.ts";

const ProviderDemo = () => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const videoPlaneRef = useRef(null);
    const videoTextureRef = useRef(null);
    const videoElementRef = useRef(null); // Will hold our local HTMLVideoElement
    const animationFrameIdRef = useRef(null);

    const [statusMessage, setStatusMessage] = useState("Idle. Click Start.");
    const [errorMessage, setErrorMessage] = useState("");

    const cam = useCameraControl();

    useEffect(() => {
        if (!mountRef.current) return;
        mountRef.current.innerHTML = ""; // Clear previous renderer

        // Create a local video element
        videoElementRef.current = document.createElement('video');
        videoElementRef.current.autoplay = true;
        videoElementRef.current.muted = true; // Essential for autoplay in most browsers
        videoElementRef.current.playsInline = true; // For iOS
        // videoElementRef.current.style.display = 'none'; // Keep it off-DOM or hidden

        sceneRef.current = new THREE.Scene();

        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        cameraRef.current = new THREE.OrthographicCamera(
            width / -2,
            width / 2,
            height / 2,
            height / -2,
            0.1,
            1000
        );
        cameraRef.current.position.z = 10;
        cameraRef.current.lookAt(sceneRef.current.position); // Explicitly look at origin

        rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
        rendererRef.current.setSize(width, height);
        mountRef.current.appendChild(rendererRef.current.domElement);

        videoTextureRef.current = new THREE.VideoTexture(videoElementRef.current);
        videoTextureRef.current.minFilter = THREE.LinearFilter;
        videoTextureRef.current.magFilter = THREE.LinearFilter;

        const planeGeometry = new THREE.PlaneGeometry(width, height);
        // Default to white material, video texture will override if it loads
        const planeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff, // White base color
            map: videoTextureRef.current, // Re-enabled
        });
        videoPlaneRef.current = new THREE.Mesh(planeGeometry, planeMaterial);
        sceneRef.current.add(videoPlaneRef.current);

        const animate = () => {
            animationFrameIdRef.current = requestAnimationFrame(animate);

            // Now check our local videoElementRef.current
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
            if (
                rendererRef.current &&
                sceneRef.current &&
                cameraRef.current
            ) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        animate();

        const handleResize = () => {
            if (
                mountRef.current &&
                rendererRef.current &&
                cameraRef.current &&
                videoPlaneRef.current
            ) {
                const newWidth = mountRef.current.clientWidth;
                const newHeight = mountRef.current.clientHeight;
                rendererRef.current.setSize(newWidth, newHeight);

                cameraRef.current.left = newWidth / -2;
                cameraRef.current.right = newWidth / 2;
                cameraRef.current.top = newHeight / 2;
                cameraRef.current.bottom = newHeight / -2;
                cameraRef.current.updateProjectionMatrix();

                videoPlaneRef.current.geometry.dispose();
                videoPlaneRef.current.geometry = new THREE.PlaneGeometry(
                    newWidth,
                    newHeight
                );
            }
        };
        window.addEventListener("resize", handleResize);

        return () => {
            cancelAnimationFrame(animationFrameIdRef.current);
            window.removeEventListener("resize", handleResize);
            if (
                rendererRef.current &&
                rendererRef.current.domElement &&
                rendererRef.current.domElement.parentNode === mountRef.current
            ) {
                mountRef.current.removeChild(rendererRef.current.domElement);
            }
            planeGeometry.dispose();
            planeMaterial.dispose();
            if (videoTextureRef.current) videoTextureRef.current.dispose();
            if (rendererRef.current) rendererRef.current.dispose();

            // Stop video stream if it's from our local element
            if (videoElementRef.current && videoElementRef.current.srcObject) {
                const stream = videoElementRef.current.srcObject; 
                if (stream && typeof stream.getTracks === 'function') { 
                    stream.getTracks().forEach(track => track.stop());
                }
                videoElementRef.current.srcObject = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!cam) return;

        // Handle stream changes
        if (cam.stream && videoElementRef.current) {
            videoElementRef.current.srcObject = cam.stream;
            videoElementRef.current.play().catch(e => console.error("Error playing local video:", e));
        } else if (!cam.stream && videoElementRef.current) {
            videoElementRef.current.srcObject = null;
        }

        const handleError = (err) => {
            console.error("Camera Error:", err);
            setErrorMessage(typeof err === 'string' ? err : (err && err.message) || "Unknown camera error");
            setStatusMessage("Error");
        };

        const handleCameraStarted = () => {
            setStatusMessage("Camera Active");
            // Ensure video plays if srcObject was set
            if (videoElementRef.current && videoElementRef.current.srcObject) {
                videoElementRef.current.play().catch(e => console.error("Error playing local video in handleCameraStarted:", e));
            }
        };

        const handleCameraStopped = () => {
            setStatusMessage("Camera Stopped. Click Start.");
        };

        const errorListenerId = cam.addErrorListener(handleError);
        const startedListenerId = cam.addStartedListener(handleCameraStarted);
        const stoppedListenerId = cam.addStoppedListener(handleCameraStopped);

        // Initial status based on cam.isOn (stream handling is separate)
        setStatusMessage(cam.isOn ? "Camera Active" : "Idle. Click Start.");
        
        // If camera is already on (e.g. due to props), ensure stream is handled
        if (cam.isOn && cam.stream && videoElementRef.current && !videoElementRef.current.srcObject) {
            videoElementRef.current.srcObject = cam.stream;
            videoElementRef.current.play().catch(e => console.error("Error playing local video on initial ON state:", e));
        }

        return () => {
            cam.removeErrorListener(errorListenerId);
            cam.removeStartedListener(startedListenerId);
            cam.removeStoppedListener(stoppedListenerId);
        };
    }, [cam]);

    const handleToggleCamera = useCallback(async () => {
        setErrorMessage("");
        if (cam.isOn) {
            cam.stopCamera();
        } else {
            try {
                await cam.startCamera();
            } catch (err) {
                setErrorMessage(err.message || "Failed to start camera.");
                setStatusMessage("Error");
            }
        }
    }, [cam]);

    const handleFlipCamera = useCallback(async () => {
        if (!cam || !cam.isOn) return;
        try {
            await cam.flipCamera();
        } catch (err) {
            setErrorMessage(err.message || "Failed to flip camera.");
        }
    }, [cam]);

    return (
        <div>
            <div
                ref={mountRef}
                style={{
                    width: "100%",
                    height: "300px",
                    backgroundColor: "#111",
                    marginBottom: "15px",
                    borderRadius: "4px",
                }}
            >
                {/* Three.js canvas will be appended here */}
            </div>
            <button onClick={handleToggleCamera} disabled={!cam}>
                {cam && cam.isOn ? "Stop Camera" : "Start Camera"}
            </button>
            <button
                onClick={handleFlipCamera}
                disabled={!cam || (cam && !cam.isOn)}
            >
                Flip Camera
            </button>
            <span className="status">Status: {statusMessage}</span>
            {errorMessage && <div className="error">Error: {errorMessage}</div>}
        </div>
    );
};

export default ProviderDemo;
