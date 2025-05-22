import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { useMicrophoneControl } from "../../../index";
import StatusDot from '../../common/StatusDot';

function ProviderDemo() {
    const mic = useMicrophoneControl();
    const mountRef = useRef(null);
    const animationIdRef = useRef(null);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (!mountRef.current || !mic) return;

        const currentMount = mountRef.current;
        currentMount.innerHTML = ""; // Clear previous renderer

        let scene, camera, renderer, bar;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x222222);

        const width = currentMount.clientWidth;
        const height = currentMount.clientHeight;

        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setClearColor(0x000000, 0); // Transparent background
        currentMount.appendChild(renderer.domElement);

        const geometry = new THREE.BoxGeometry(1, 0.1, 1); // Initial small height
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        bar = new THREE.Mesh(geometry, material);
        bar.position.y = -0.5; // Anchor at bottom
        scene.add(bar);

        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
        };
        animate();

        const handleAudioData = (data) => {
            if (bar && data && data.length > 0) {
                let sumSquares = 0.0;
                for (const amplitude of data) {
                    sumSquares += amplitude * amplitude;
                }
                const rms = Math.sqrt(sumSquares / data.length);
                const maxHeight = 5; // Max height of the bar
                const newHeight = Math.min(
                    Math.max(0.1, rms * maxHeight * 10),
                    maxHeight
                ); // Scale and clamp height

                bar.scale.y = newHeight / 0.1; // Scale based on initial geometry height of 0.1
                bar.position.y = newHeight / 2 - 0.1 / 2; // Adjust position based on new height
            }
        };

        const handleMicError = (error) => {
            console.error("Microphone Error:", error);
            setErrorMessage(
                typeof error === "string"
                    ? error
                    : error?.message || "Unknown microphone error"
            );
        };

        const handleMicStarted = () => {
            console.log("Microphone started");
            setErrorMessage("");
        };

        const handleMicStopped = () => {
            console.log("Microphone stopped");
            // Reset bar when stopped
            if (bar) {
                bar.scale.y = 1; // Reset to initial scale related to 0.1 height
                bar.position.y = -0.5;
            }
        };

        const audioDataListenerId = mic.addAudioDataListener(handleAudioData);
        const errorListenerId = mic.addErrorListener(handleMicError);
        const startListenerId = mic.addStartListener(handleMicStarted);
        const stopListenerId = mic.addStopListener(handleMicStopped);

        const handleResize = () => {
            if (camera && renderer && currentMount) {
                const newWidth = currentMount.clientWidth;
                const newHeight = currentMount.clientHeight;
                camera.aspect = newWidth / newHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(newWidth, newHeight);
            }
        };
        window.addEventListener("resize", handleResize);

        return () => {
            mic.removeAudioDataListener(audioDataListenerId);
            mic.removeErrorListener(errorListenerId);
            mic.removeStartListener(startListenerId);
            mic.removeStopListener(stopListenerId);

            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
                animationIdRef.current = null;
            }
            window.removeEventListener("resize", handleResize);

            if (
                renderer &&
                renderer.domElement &&
                currentMount.contains(renderer.domElement)
            ) {
                currentMount.removeChild(renderer.domElement);
            }

            if (bar) {
                if (bar.geometry) bar.geometry.dispose();
                if (bar.material) bar.material.dispose();
            }
            if (renderer) renderer.dispose();
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
            }
        }
    }, [mic]);

    return (
        <div
            style={{
                padding: "20px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                maxWidth: "500px",
                margin: "20px auto",
                backgroundColor: "#f9f9f9",
            }}
        >
            <div
                ref={mountRef}
                style={{
                    width: "100%",
                    height: "150px", // Fixed height, can adjust if needed
                    backgroundColor: "#111",
                    borderRadius: "4px",
                    border: "1px solid #444",
                    marginBottom: "10px", // Gap below canvas
                }}
            ></div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <button
                    onClick={handleToggleMicrophone}
                    disabled={!mic}
                    style={{ marginRight: "10px" }}
                >
                    {mic && mic.isRecording()
                        ? "Stop Microphone"
                        : "Start Microphone"}
                </button>
                {mic && <StatusDot isActive={mic.isRecording()} />}
            </div>
            {errorMessage && (
                <div
                    style={{
                        color: "red",
                        marginTop: "10px",
                        textAlign: "center",
                    }}
                >
                    Error: {errorMessage}
                </div>
            )}
        </div>
    );
}

export default ProviderDemo;
