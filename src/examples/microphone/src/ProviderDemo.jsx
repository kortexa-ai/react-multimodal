import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useMicrophoneControl } from '../../../index.ts';

const ProviderDemo = () => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const barRef = useRef(null);
    const animationFrameIdRef = useRef(null);
    const latestAmplitudeRef = useRef(0); // Ref to hold the latest amplitude for the animation loop

    const [statusMessage, setStatusMessage] = useState("Idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [latestAmplitude, setLatestAmplitude] = useState(0);

    const mic = useMicrophoneControl();

    // Three.js setup effect - should run only once on mount
    useEffect(() => {
        if (!mountRef.current) return;

        // Ensure the mount point is empty before appending a new canvas (for StrictMode)
        mountRef.current.innerHTML = '';

        // Scene
        sceneRef.current = new THREE.Scene();
        sceneRef.current.background = new THREE.Color(0x222222);

        // Camera
        cameraRef.current = new THREE.PerspectiveCamera(
            75,
            mountRef.current.clientWidth / mountRef.current.clientHeight,
            0.1,
            1000
        );
        cameraRef.current.position.z = 5;

        // Renderer
        rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
        rendererRef.current.setSize(
            mountRef.current.clientWidth,
            mountRef.current.clientHeight
        );
        mountRef.current.appendChild(rendererRef.current.domElement);

        // Amplitude Bar
        const geometry = new THREE.BoxGeometry(1, 1, 1); // Initial height 1
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        barRef.current = new THREE.Mesh(geometry, material);
        barRef.current.position.y = -0.5; // Anchor at bottom
        sceneRef.current.add(barRef.current);

        // Animation loop
        const animate = () => {
            animationFrameIdRef.current = requestAnimationFrame(animate);
            if (barRef.current) {
                // Scale the bar based on the latest amplitude from the ref
                const targetScale = Math.max(0.01, latestAmplitudeRef.current * 10); // Use ref here
                barRef.current.scale.y = THREE.MathUtils.lerp(
                    barRef.current.scale.y,
                    targetScale,
                    0.1
                );
                barRef.current.position.y = barRef.current.scale.y / 2 - 0.5; // Keep bottom anchored
            }
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            if (mountRef.current && rendererRef.current && cameraRef.current) {
                const width = mountRef.current.clientWidth;
                const height = mountRef.current.clientHeight;
                rendererRef.current.setSize(width, height);
                cameraRef.current.aspect = width / height;
                cameraRef.current.updateProjectionMatrix();
            }
        };
        window.addEventListener("resize", handleResize);

        return () => {
            cancelAnimationFrame(animationFrameIdRef.current);
            window.removeEventListener("resize", handleResize);
            
            // Check if the canvas is still a child before removing
            if (rendererRef.current && rendererRef.current.domElement && rendererRef.current.domElement.parentNode === mountRef.current) {
              mountRef.current.removeChild(rendererRef.current.domElement);
            }
            
            // Dispose Three.js objects
            geometry.dispose(); 
            material.dispose();
            if (rendererRef.current) rendererRef.current.dispose();
        };
    }, []); // Empty dependency array: runs only on mount and unmount

    // Effect to update the amplitude ref whenever the state changes
    useEffect(() => {
        latestAmplitudeRef.current = latestAmplitude;
    }, [latestAmplitude]);

    // Microphone listeners effect
    useEffect(() => {
        if (!mic) return;

        const handleData = (audioData) => {
            // Calculate a simple average amplitude
            let sum = 0;
            for (let i = 0; i < audioData.length; i++) {
                sum += Math.abs(audioData[i]);
            }
            const avgAmplitude =
                audioData.length > 0 ? sum / audioData.length : 0;
            setLatestAmplitude(avgAmplitude);
        };

        const handleError = (err) => {
            setErrorMessage(err || "An unknown microphone error occurred.");
            setStatusMessage("Error");
        };

        const handleStart = () => setStatusMessage("Recording...");
        const handleStop = () => setStatusMessage("Stopped.");

        const dataListenerId = mic.addAudioDataListener(handleData);
        const errorListenerId = mic.addErrorListener(handleError);
        const startListenerId = mic.addStartListener(handleStart);
        const stopListenerId = mic.addStopListener(handleStop);

        // Initial status
        setStatusMessage(
            mic.isRecording() ? "Recording..." : "Idle. Click Start."
        );

        return () => {
            mic.removeAudioDataListener(dataListenerId);
            mic.removeErrorListener(errorListenerId);
            mic.removeStartListener(startListenerId);
            mic.removeStopListener(stopListenerId);
        };
    }, [mic]);

    const handleToggleMicrophone = useCallback(async () => {
        setErrorMessage(""); // Clear previous errors
        if (mic.isRecording()) {
            mic.stop();
        } else {
            try {
                await mic.start();
            } catch (err) {
                // Error should be caught by the error listener, but just in case:
                setErrorMessage(err.message || "Failed to start microphone.");
                setStatusMessage("Error");
            }
        }
    }, [mic]);

    return (
        <div>
            <div
                ref={mountRef}
                style={{
                    width: "100%",
                    height: "200px",
                    backgroundColor: "#111",
                    marginBottom: "15px",
                    borderRadius: "4px",
                }}
            >
                {/* Three.js canvas will be appended here */}
            </div>
            <button onClick={handleToggleMicrophone} disabled={!mic}>
                {mic && mic.isRecording()
                    ? "Stop Microphone"
                    : "Start Microphone"}
            </button>
            <span className="status">Status: {statusMessage}</span>
            {errorMessage && <div className="error">Error: {errorMessage}</div>}
        </div>
    );
};

export default ProviderDemo;
