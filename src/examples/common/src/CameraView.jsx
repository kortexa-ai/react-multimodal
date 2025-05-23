import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Standard MediaPipe Hand Connections
const HAND_CONNECTIONS = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index Finger
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle Finger
    [0, 9], [9, 10], [10, 11], [11, 12],
    // Ring Finger
    [0, 13], [13, 14], [14, 15], [15, 16],
    // Pinky Finger
    [0, 17], [17, 18], [18, 19], [19, 20],
    // Palm
    [5, 9], [9, 13], [13, 17], [17, 5]
];

// Colors for connections, corresponding to HAND_CONNECTIONS order
const CONNECTION_COLORS = [
    // Thumb (4 connections)
    'red', 'red', 'red', 'red',
    // Index Finger (4 connections)
    'lime', 'lime', 'lime', 'lime',
    // Middle Finger (4 connections)
    'blue', 'blue', 'blue', 'blue',
    // Ring Finger (4 connections)
    'yellow', 'yellow', 'yellow', 'yellow',
    // Pinky Finger (4 connections)
    'fuchsia', 'fuchsia', 'fuchsia', 'fuchsia',
    // Palm (4 connections)
    'white', 'white', 'white', 'white'
];

const LANDMARK_COLOR = 'aqua'; // Default color for non-fingertip landmarks
const FINGERTIP_COLORS = {
    4: 'red',       // Thumb tip
    8: 'lime',      // Index finger tip
    12: 'blue',     // Middle finger tip
    16: 'yellow',   // Ring finger tip
    20: 'fuchsia'   // Pinky tip
};
const LANDMARK_RADIUS = 5;
const LINE_WIDTH = 3;

function CameraView({ stream, onVideoElementReady, handsData, showHands = true }) {
    const mountRef = useRef(null);
    const videoElementRef = useRef(null);
    const rendererRef = useRef(null); // To store renderer instance for cleanup
    const sceneRef = useRef(null); // To store scene instance for cleanup
    const cameraRef = useRef(null); // To store camera instance for cleanup
    const videoTextureRef = useRef(null);
    const videoPlaneRef = useRef(null);
    const animationFrameIdRef = useRef(null);
    const videoMetadataListenerRef = useRef(null);

    // For overlay canvas
    const overlayCanvasRef = useRef(null);
    const [overlayWidth, setOverlayWidth] = useState(0);
    const [overlayHeight, setOverlayHeight] = useState(0);
    const prevStream = useRef(stream); // For tracking stream changes

    useEffect(() => {
        prevStream.current = stream;

        const currentMount = mountRef.current;
        if (!currentMount) return;

        // Initialize video element
        if (!videoElementRef.current) {
            videoElementRef.current = document.createElement("video");
            videoElementRef.current.playsInline = true;
            videoElementRef.current.muted = true;
            videoElementRef.current.autoplay = true; // Autoplay once stream is set
            if (typeof onVideoElementReady === 'function') {
                onVideoElementReady(videoElementRef.current);
            }
        }
        const videoElement = videoElementRef.current;

        // Scene, Camera, Renderer setup (local to this effect scope for init)
        let scene, camera, renderer;

        const initThreeJS = (currentStream) => {
            if (!currentMount || !videoElement) return;
            currentMount.innerHTML = ""; // Clear previous canvas

            videoElement.srcObject = currentStream;
            if (currentStream && typeof onVideoElementReady === 'function') {
                onVideoElementReady(videoElementRef.current);
            }

            const width = currentMount.clientWidth;
            const height = currentMount.clientHeight;

            scene = new THREE.Scene();
            sceneRef.current = scene;
            camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            camera.position.z = 1; // Adjust as needed
            cameraRef.current = camera;

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(width, height);
            rendererRef.current = renderer; // Store for cleanup and resize
            currentMount.appendChild(renderer.domElement);

            videoTextureRef.current = new THREE.VideoTexture(videoElement);

            const onVideoMetadataLoaded = () => {
                if (
                    !sceneRef.current ||
                    !videoTextureRef.current ||
                    !videoElement ||
                    !cameraRef.current // Ensure cameraRef is available
                )
                    return;

                if (videoPlaneRef.current) {
                    sceneRef.current.remove(videoPlaneRef.current);
                    if (videoPlaneRef.current.geometry)
                        videoPlaneRef.current.geometry.dispose();
                    // Material and texture are reused
                }

                const videoW = videoElement.videoWidth;
                const videoH = videoElement.videoHeight;

                if (!videoW || !videoH || isNaN(videoW) || isNaN(videoH)) {
                    return;
                }
                const videoAspect = videoW / videoH;

                // --- Start of new "cover" logic ---
                const camera = cameraRef.current;
                const texture = videoTextureRef.current;

                // Calculate plane dimensions to fill camera's FOV
                const distance = camera.position.z;
                const fovInRadians = THREE.MathUtils.degToRad(camera.fov);
                const targetPlaneHeight = 2 * Math.tan(fovInRadians / 2) * distance;
                const targetPlaneWidth = targetPlaneHeight * camera.aspect;

                const geometry = new THREE.PlaneGeometry(targetPlaneWidth, targetPlaneHeight);
                const material = videoPlaneRef.current?.material || new THREE.MeshBasicMaterial({ map: texture });
                if (!material.map) material.map = texture;

                const newVideoPlane = new THREE.Mesh(geometry, material);
                videoPlaneRef.current = newVideoPlane;
                sceneRef.current.add(newVideoPlane);

                // Adjust texture UVs for "cover" effect
                const planeAspect = targetPlaneWidth / targetPlaneHeight; // This is camera.aspect

                if (videoAspect > planeAspect) { // Video is wider than the plane's aspect ratio
                    texture.repeat.x = planeAspect / videoAspect;
                    texture.repeat.y = 1;
                    texture.offset.x = (1 - texture.repeat.x) / 2;
                    texture.offset.y = 0;
                } else { // Video is taller or same aspect as the plane
                    texture.repeat.x = 1;
                    texture.repeat.y = videoAspect / planeAspect;
                    texture.offset.x = 0;
                    texture.offset.y = (1 - texture.repeat.y) / 2;
                }
                texture.needsUpdate = true; // Important for texture changes
                // --- End of new "cover" logic ---

                videoPlaneRef.current.scale.x = -1; // Mirror the video plane for a true mirror effect

                if (cameraRef.current)
                    cameraRef.current.lookAt(newVideoPlane.position);

                videoElement
                    .play()
                    .catch((e) =>
                        console.error("CameraView: Error playing video:", e)
                    );
            };

            // Store the listener function itself to remove it correctly
            videoMetadataListenerRef.current = onVideoMetadataLoaded;
            videoElement.addEventListener(
                "loadedmetadata",
                videoMetadataListenerRef.current
            );

            const animate = () => {
                animationFrameIdRef.current = requestAnimationFrame(animate);
                if (videoTextureRef.current)
                    videoTextureRef.current.needsUpdate = true;
                if (
                    rendererRef.current &&
                    sceneRef.current &&
                    cameraRef.current
                ) {
                    rendererRef.current.render(
                        sceneRef.current,
                        cameraRef.current
                    );
                }
            };
            animate();
        };

        if (stream) {
            if (!rendererRef.current) {
                // If Three.js isn't initialized yet
                initThreeJS(stream);
            } else {
                // If already initialized, just update srcObject
                videoElement.srcObject = stream;
                if (stream && typeof onVideoElementReady === 'function') {
                    onVideoElementReady(videoElementRef.current);
                }
                // Metadata listener should still be active or re-added if necessary
                // Consider if onVideoMetadataLoaded needs to be called again or if texture updates suffice
                if (videoMetadataListenerRef.current) {
                    videoElement.removeEventListener(
                        "loadedmetadata",
                        videoMetadataListenerRef.current
                    );
                }
                videoMetadataListenerRef.current = () => {
                    // Simplified re-attach for existing setup
                    if (!videoElement || !videoTextureRef.current) return;
                    const videoW = videoElement.videoWidth;
                    const videoH = videoElement.videoHeight;
                    if (!videoW || !videoH || isNaN(videoW) || isNaN(videoH))
                        return;
                    const videoAspect = videoW / videoH;
                    const planeHeight = 1;
                    const planeWidth = planeHeight * videoAspect;

                    if (
                        videoPlaneRef.current &&
                        videoPlaneRef.current.geometry
                    ) {
                        // Dispose old geometry
                        videoPlaneRef.current.geometry.dispose();
                        // Create and assign new geometry
                        videoPlaneRef.current.geometry =
                            new THREE.PlaneGeometry(planeWidth, planeHeight);
                    }
                    videoElement  
                        .play()
                        .catch((e) =>
                            console.error(
                                "CameraView: Error playing video in loadedmetadata:",
                                e
                            )
                        );
                };
                videoElement.addEventListener(
                    "loadedmetadata",
                    videoMetadataListenerRef.current
                );
            }
        } else {
            // Cleanup Three.js if stream is removed
            if (animationFrameIdRef.current)
                cancelAnimationFrame(animationFrameIdRef.current);
            if (videoElement.srcObject) {
                const tracks = videoElement.srcObject.getTracks();
                tracks.forEach((track) => track.stop());
                videoElement.srcObject = null;
                if (typeof onVideoElementReady === 'function') {
                    onVideoElementReady(null);
                }
            }
            if (
                rendererRef.current &&
                rendererRef.current.domElement &&
                mountRef.current &&
                mountRef.current.contains(rendererRef.current.domElement)
            ) {
                mountRef.current.removeChild(rendererRef.current.domElement);
            }
            if (videoTextureRef.current) videoTextureRef.current.dispose();
            if (videoPlaneRef.current && videoPlaneRef.current.geometry)
                videoPlaneRef.current.geometry.dispose();
            if (videoPlaneRef.current && videoPlaneRef.current.material)
                videoPlaneRef.current.material.dispose();
            if (rendererRef.current) rendererRef.current.dispose();
            rendererRef.current = null;
            sceneRef.current = null;
            cameraRef.current = null; // Clear refs
            videoPlaneRef.current = null;
            videoTextureRef.current = null;
            if (mountRef.current) { // Ensure mountRef.current exists before clearing
                mountRef.current.innerHTML = ""; // Clear mount point
            }
        }

        const handleResize = () => {
            if (cameraRef.current && rendererRef.current && mountRef.current && videoElementRef.current && videoTextureRef.current && videoPlaneRef.current) {
                const width = mountRef.current.clientWidth;
                const height = mountRef.current.clientHeight;

                cameraRef.current.aspect = width / height;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(width, height);

                // --- Recalculate plane size and UVs for "cover" on resize ---
                const videoElement = videoElementRef.current;
                const videoW = videoElement.videoWidth;
                const videoH = videoElement.videoHeight;

                if (!videoW || !videoH || isNaN(videoW) || isNaN(videoH)) {
                    return;
                }
                const videoAspect = videoW / videoH;

                const camera = cameraRef.current;
                const texture = videoTextureRef.current;

                const distance = camera.position.z;
                const fovInRadians = THREE.MathUtils.degToRad(camera.fov);
                const targetPlaneHeight = 2 * Math.tan(fovInRadians / 2) * distance;
                const targetPlaneWidth = targetPlaneHeight * camera.aspect;

                // Update plane geometry
                if (videoPlaneRef.current.geometry) videoPlaneRef.current.geometry.dispose();
                videoPlaneRef.current.geometry = new THREE.PlaneGeometry(targetPlaneWidth, targetPlaneHeight);

                // Update UVs
                const planeAspect = targetPlaneWidth / targetPlaneHeight;
                if (videoAspect > planeAspect) {
                    texture.repeat.x = planeAspect / videoAspect;
                    texture.repeat.y = 1;
                    texture.offset.x = (1 - texture.repeat.x) / 2;
                    texture.offset.y = 0;
                } else {
                    texture.repeat.x = 1;
                    texture.repeat.y = videoAspect / planeAspect;
                    texture.offset.x = 0;
                    texture.offset.y = (1 - texture.repeat.y) / 2;
                }
                texture.needsUpdate = true;
                // --- End of resize "cover" logic ---
            }
        };
        window.addEventListener("resize", handleResize);

        const currentMountRef = mountRef.current;

        return () => {
            window.removeEventListener("resize", handleResize);
            if (animationFrameIdRef.current)
                cancelAnimationFrame(animationFrameIdRef.current);

            const currentLocalVideoElement = videoElementRef.current;
            const currentMetaListener = videoMetadataListenerRef.current;
            if (currentLocalVideoElement && currentMetaListener) {
                currentLocalVideoElement.removeEventListener(
                    "loadedmetadata",
                    currentMetaListener
                );
            }

            if (videoPlaneRef.current) {
                if (
                    sceneRef.current &&
                    videoPlaneRef.current.parent === sceneRef.current
                )
                    sceneRef.current.remove(videoPlaneRef.current);
                if (videoPlaneRef.current.geometry)
                    videoPlaneRef.current.geometry.dispose();
                if (videoPlaneRef.current.material)
                    videoPlaneRef.current.material.dispose();
            }
            if (videoTextureRef.current) videoTextureRef.current.dispose();
            if (rendererRef.current) {
                rendererRef.current.dispose();
                // Ensure mountRef.current exists before trying to removeChild
                if (
                    rendererRef.current.domElement &&
                    currentMountRef &&
                    currentMountRef.contains(rendererRef.current.domElement)
                ) {
                    currentMountRef.removeChild(
                        rendererRef.current.domElement
                    );
                }
            }
            // videoElement is persisted via ref, not removed from DOM here unless mountRef.current is cleared
        };
    }, [stream, onVideoElementReady]); // Effect dependencies

    // Effect for ResizeObserver to update overlay canvas dimensions
    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                setOverlayWidth(entry.contentRect.width);
                setOverlayHeight(entry.contentRect.height);
            }
        });

        resizeObserver.observe(currentMount);
        // Set initial dimensions
        setOverlayWidth(currentMount.clientWidth);
        setOverlayHeight(currentMount.clientHeight);

        return () => {
            resizeObserver.unobserve(currentMount);
        };
    }, []); // Runs once on mount

    // Effect for drawing hand landmarks
    useEffect(() => {
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;

        // Set canvas physical dimensions for drawing
        canvas.width = overlayWidth;
        canvas.height = overlayHeight;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, overlayWidth, overlayHeight); // Clear previous drawings

        if (!showHands || !handsData || !handsData.detectedHands || overlayWidth === 0 || overlayHeight === 0) {
            return; // No data, canvas not ready, or showHands is false
        }

        handsData.detectedHands.forEach(hand => {
            if (hand.landmarks) {
                // Draw connections first
                HAND_CONNECTIONS.forEach((connection, index) => {
                    const [startIdx, endIdx] = connection;
                    const startLandmark = hand.landmarks[startIdx];
                    const endLandmark = hand.landmarks[endIdx];

                    if (startLandmark && endLandmark) {
                        const startX = startLandmark.x * overlayWidth;
                        const startY = startLandmark.y * overlayHeight;
                        const endX = endLandmark.x * overlayWidth;
                        const endY = endLandmark.y * overlayHeight;

                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(endX, endY);
                        ctx.strokeStyle = CONNECTION_COLORS[index] || 'white'; // Default to white if color not found
                        ctx.lineWidth = LINE_WIDTH;
                        ctx.stroke();
                    }
                });

                // Draw landmarks on top of connections
                hand.landmarks.forEach((landmark, index) => {
                    const x = landmark.x * overlayWidth;
                    const y = landmark.y * overlayHeight;
                    const color = FINGERTIP_COLORS[index] || LANDMARK_COLOR;

                    ctx.beginPath();
                    ctx.arc(x, y, LANDMARK_RADIUS, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();
                });
            }
        });

    }, [handsData, overlayWidth, overlayHeight, showHands]);

    // The div that Three.js will render into.
    // Its class for styling (e.g., camera-view-container) should be applied by the parent component.
    return (
        <div style={{ position: 'relative', width: "100%", height: "100%" }}>
            <div ref={mountRef} style={{ width: "100%", height: "100%" }}></div>
            <canvas
                ref={overlayCanvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    // width and height are controlled by canvas.width/height attributes for drawing surface size
                    // CSS width/height 100% ensures it stretches to the parent's dimensions for layout
                    width: '100%', 
                    height: '100%',
                    pointerEvents: 'none', // Allow interactions with elements below
                }}
            />
        </div>
    );
}

export default CameraView;
