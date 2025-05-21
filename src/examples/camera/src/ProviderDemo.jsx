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
    const animationFrameIdRef = useRef(null);
    const videoElementRef = useRef(null);

    const [statusMessage, setStatusMessage] = useState("Idle");
    const [errorMessage, setErrorMessage] = useState("");

    const cam = useCameraControl();

    useEffect(() => {
        if (!mountRef.current) return;
        mountRef.current.innerHTML = "";

        sceneRef.current = new THREE.Scene();
        sceneRef.current.background = new THREE.Color(0x222222);

        // Axes Helper
        const axesHelper = new THREE.AxesHelper(100); // Made larger: 100 units
        sceneRef.current.add(axesHelper);

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

        // Camera Helper
        const cameraHelper = new THREE.CameraHelper(cameraRef.current);
        sceneRef.current.add(cameraHelper);

        rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
        rendererRef.current.setSize(width, height);
        mountRef.current.appendChild(rendererRef.current.domElement);

        videoTextureRef.current = new THREE.Texture();
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
            console.log("Animating...");

            if (videoTextureRef.current && cam && cam.videoElement) {
                // Log video element state
                console.log(
                    `Video State: readyState=${cam.videoElement.readyState}, ` +
                    `paused=${cam.videoElement.paused}, ` +
                    `width=${cam.videoElement.videoWidth}, ` +
                    `height=${cam.videoElement.videoHeight}`
                );

                if (
                    cam.videoElement.readyState >= cam.videoElement.HAVE_METADATA && // Enough data to play
                    !cam.videoElement.paused && // Is actually playing
                    cam.videoElement.videoWidth > 0 && // Has valid dimensions
                    cam.videoElement.videoHeight > 0
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
        };
    }, []);

    useEffect(() => {
        console.log("[Effect cam] cam object:", cam);
        if (!cam) return;

        const handleError = (err) => {
            setErrorMessage(
                err?.message || err || "An unknown camera error occurred."
            );
            setStatusMessage("Error");
        };

        const handleCameraStarted = () => {
            setStatusMessage("Camera Active");
            console.log("[handleCameraStarted] cam.videoElement:", cam.videoElement);
            if (cam.videoElement && videoTextureRef.current) {
                videoElementRef.current = cam.videoElement;
                videoTextureRef.current.image = cam.videoElement;
                
                // Ensure video is muted and plays inline for autoplay
                cam.videoElement.muted = true;
                cam.videoElement.playsInline = true;

                cam.videoElement.play().catch((e) =>
                    console.error("Error playing video:", e)
                );
                videoTextureRef.current.needsUpdate = true; // Initial update
            }
        };

        const handleCameraStopped = () => {
            setStatusMessage("Camera Idle");
            if (videoTextureRef.current) {
                // videoTextureRef.current.image = null; // Or a placeholder image
                // videoTextureRef.current.needsUpdate = true;
            }
        };

        const errorListenerId = cam.addErrorListener(handleError);
        const startedListenerId = cam.addStartedListener(handleCameraStarted);
        const stoppedListenerId = cam.addStoppedListener(handleCameraStopped);

        setStatusMessage(cam.isOn ? "Camera Active" : "Idle. Click Start.");
        console.log(`[Effect cam] cam.isOn: ${cam.isOn}, cam.videoElement:`, cam.videoElement);
        if (cam.isOn && cam.videoElement && videoTextureRef.current) {
            videoElementRef.current = cam.videoElement;
            videoTextureRef.current.image = cam.videoElement;

            // Ensure video is muted and plays inline for autoplay
            cam.videoElement.muted = true;
            cam.videoElement.playsInline = true;

            cam.videoElement.play().catch((e) =>
                console.error("Error playing video on init:", e)
            );
            videoTextureRef.current.needsUpdate = true; // Initial update
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
