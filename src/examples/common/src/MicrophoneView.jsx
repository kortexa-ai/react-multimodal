import { useEffect, useRef } from "react";
import * as THREE from "three";

function MicrophoneView({ mic }) {
    const mountRef = useRef(null);
    const animationIdRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const barRef = useRef(null);
    const maxWidthInSceneUnitsRef = useRef(10); // Will be based on ortho camera view
    const sceneHeightUnitsRef = useRef(2); // e.g., view from -1 to 1 vertically

    useEffect(() => {
        if (!mountRef.current || !mic) {
            if (mountRef.current) mountRef.current.innerHTML = ""; // Clear if mic not ready
            return;
        }

        const currentMount = mountRef.current;
        currentMount.innerHTML = ""; // Clear previous renderer

        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const width = currentMount.clientWidth || 300;
        const height = currentMount.clientHeight || 100;
        const aspect = width / height;

        // Orthographic Camera setup
        const sceneViewHeight = sceneHeightUnitsRef.current;
        const sceneViewWidth = sceneViewHeight * aspect;
        maxWidthInSceneUnitsRef.current = sceneViewWidth;

        const camera = new THREE.OrthographicCamera(
            sceneViewWidth / -2, // left
            sceneViewWidth / 2, // right
            sceneViewHeight / 2, // top
            sceneViewHeight / -2, // bottom
            0.1, // near
            1000 // far
        );
        camera.position.z = 5; // Still need a z-position
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        renderer.setSize(width, height);
        renderer.setClearColor(0x000000, 0); // Transparent background
        rendererRef.current = renderer;
        currentMount.appendChild(renderer.domElement);
        renderer.domElement.style.display = "block"; // Ensure block display for canvas

        const BAR_THICKNESS_SCENE_UNITS = 2; //0.25; // Half of previous thickness
        const INITIAL_BAR_WIDTH_SCENE_UNITS = 0.001; // Keep small for initial state before first audio data

        const geometry = new THREE.BoxGeometry(
            INITIAL_BAR_WIDTH_SCENE_UNITS,
            BAR_THICKNESS_SCENE_UNITS,
            1
        );
        const material = new THREE.MeshBasicMaterial({ color: 0x0077ff }); // Changed color for visibility
        const bar = new THREE.Mesh(geometry, material);
        barRef.current = bar;
        scene.add(bar);
        // Initial position will be set by handleMicStoppedVisuals after maxWidthInSceneUnitsRef is set

        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        animate();

        const handleData = (data) => {
            const currentBar = barRef.current;
            const maxWidthInScene = maxWidthInSceneUnitsRef.current;
            if (
                currentBar &&
                data &&
                data.length > 0 &&
                data.some((amp) => amp > 0)
            ) {
                // Check for actual audio activity
                currentBar.visible = true;
                let sumSquares = 0.0;
                for (const amplitude of data) {
                    sumSquares += amplitude * amplitude;
                }
                const rms = Math.sqrt(sumSquares / data.length);

                // Target width based on RMS, scaled to scene width
                // The sensitivity factor (e.g., 8) might need tuning
                const targetBarWidth = Math.min(
                    Math.max(
                        INITIAL_BAR_WIDTH_SCENE_UNITS,
                        rms * maxWidthInScene * 8
                    ),
                    maxWidthInScene
                );
                // Ensure targetBarWidth is not NaN or undefined if rms is weird
                if (
                    Number.isNaN(targetBarWidth) ||
                    typeof targetBarWidth === "undefined"
                )
                    return;

                currentBar.scale.x =
                    targetBarWidth / INITIAL_BAR_WIDTH_SCENE_UNITS;
                // Position the bar so its left edge is at -maxWidthInScene / 2
                currentBar.position.x =
                    targetBarWidth / 2 - maxWidthInScene / 2;
                currentBar.position.y = 0; // Center the bar's centerline at y=0 (canvas center)
            }
        };

        const handleMicStoppedVisuals = () => {
            const currentBar = barRef.current;
            const maxWidthInScene = maxWidthInSceneUnitsRef.current;
            if (currentBar) {
                currentBar.visible = false; // Hide bar when mic is stopped
                // Still set scale/position for when it becomes visible again, though it won't be seen now
                currentBar.scale.x = 1;
                currentBar.position.x =
                    INITIAL_BAR_WIDTH_SCENE_UNITS / 2 - maxWidthInScene / 2;
                currentBar.position.y = 0; // Center the bar's centerline at y=0 (canvas center)
            }
        };
        handleMicStoppedVisuals(); // Initial state

        const audioDataListenerId = mic.addDataListener(handleData);
        const stopListenerId = mic.addStopListener(handleMicStoppedVisuals);

        const handleResize = () => {
            const currentCam = cameraRef.current;
            const currentRenderer = rendererRef.current;
            const currentMnt = mountRef.current;
            if (currentCam && currentRenderer && currentMnt) {
                const newWidthPx = currentMnt.clientWidth;
                const newHeightPx = currentMnt.clientHeight;
                if (newWidthPx > 0 && newHeightPx > 0) {
                    const newAspect = newWidthPx / newHeightPx;
                    const sHeight = sceneHeightUnitsRef.current;

                    currentCam.left = (sHeight * newAspect) / -2;
                    currentCam.right = (sHeight * newAspect) / 2;
                    currentCam.top = sHeight / 2;
                    currentCam.bottom = sHeight / -2;
                    currentCam.updateProjectionMatrix();
                    currentRenderer.setSize(newWidthPx, newHeightPx);

                    maxWidthInSceneUnitsRef.current = sHeight * newAspect;

                    if (!mic.isRecording) {
                        handleMicStoppedVisuals();
                    }
                }
            }
        };
        window.addEventListener("resize", handleResize);
        handleResize(); // Initial size check

        return () => {
            mic.removeDataListener(audioDataListenerId);
            mic.removeStopListener(stopListenerId);

            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
                animationIdRef.current = null;
            }
            window.removeEventListener("resize", handleResize);

            const currentRenderer = rendererRef.current;
            if (
                currentRenderer?.domElement &&
                currentMount?.contains(currentRenderer.domElement)
            ) {
                currentMount.removeChild(currentRenderer.domElement);
            }

            const currentBar = barRef.current;
            if (currentBar) {
                if (currentBar.geometry) currentBar.geometry.dispose();
                if (currentBar.material) currentBar.material.dispose();
            }
            if (currentRenderer) currentRenderer.dispose();
            // Nullify refs
            sceneRef.current = null;
            cameraRef.current = null;
            rendererRef.current = null;
            barRef.current = null;
            maxWidthInSceneUnitsRef.current = null;
        };
    }, [mic]);

    return <div ref={mountRef} className="microphone-view-container" />;
};

export default MicrophoneView;
