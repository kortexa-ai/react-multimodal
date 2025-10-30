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

// MediaPipe Body Pose Connections (33 landmarks)
const BODY_CONNECTIONS = [
    // Face
    [0, 1], [1, 2], [2, 3], [3, 7],
    [0, 4], [4, 5], [5, 6], [6, 8],
    [9, 10],

    // Torso
    [11, 12], [11, 13], [12, 14], [13, 15], [14, 16],
    [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
    [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],

    // Arms
    [15, 17], [16, 18], [17, 19], [18, 20], [19, 21], [20, 22],
    [15, 21], [16, 22]
];

// MediaPipe Face Landmark Connections (key facial features)
const FACE_CONNECTIONS = [
    // Face outline
    [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454], [454, 323], [323, 361], [361, 288],
    [288, 397], [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152], [152, 148], [148, 176], [176, 149], [149, 150],
    [150, 136], [136, 172], [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], [162, 21], [21, 54], [54, 103],
    [103, 67], [67, 109], [109, 10],

    // Left eye
    [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154], [154, 155], [155, 133], [133, 173], [173, 157], [157, 158],
    [158, 159], [159, 160], [160, 161], [161, 246], [246, 33],

    // Right eye
    [362, 382], [382, 381], [381, 380], [380, 374], [374, 373], [373, 390], [390, 249], [249, 263], [263, 466], [466, 388], [388, 387],
    [387, 386], [386, 385], [385, 384], [384, 398], [398, 362],

    // Nose
    [19, 94], [94, 125], [125, 141], [141, 235], [235, 31], [31, 228], [228, 229], [229, 230], [230, 231], [231, 232], [232, 233],
    [233, 244], [244, 245], [245, 122], [122, 6], [6, 202], [202, 214], [214, 234], [234, 19],

    // Mouth outer
    [61, 84], [84, 17], [17, 314], [314, 405], [405, 320], [320, 307], [307, 375], [375, 321], [321, 308], [308, 324], [324, 318],
    [318, 402], [402, 317], [317, 14], [14, 87], [87, 178], [178, 88], [88, 95], [95, 78], [78, 61],

    // Mouth inner
    [78, 95], [95, 88], [88, 178], [178, 87], [87, 14], [14, 317], [317, 402], [402, 318], [318, 324], [324, 308], [308, 415],
    [415, 310], [310, 311], [311, 312], [312, 13], [13, 82], [82, 81], [81, 80], [80, 78]
];

// Key body landmarks for highlighting (MediaPipe Pose 33 landmarks)
const BODY_KEYPOINTS = {
    // Face
    nose: 0,
    leftEyeInner: 1, leftEye: 2, leftEyeOuter: 3,
    rightEyeInner: 4, rightEye: 5, rightEyeOuter: 6,
    leftEar: 7, rightEar: 8,
    mouthLeft: 9, mouthRight: 10,

    // Upper body
    leftShoulder: 11, rightShoulder: 12,
    leftElbow: 13, rightElbow: 14,
    leftWrist: 15, rightWrist: 16,

    // Hands
    leftPinky: 17, rightPinky: 18,
    leftIndex: 19, rightIndex: 20,
    leftThumb: 21, rightThumb: 22,

    // Lower body
    leftHip: 23, rightHip: 24,
    leftKnee: 25, rightKnee: 26,
    leftAnkle: 27, rightAnkle: 28,
    leftHeel: 29, rightHeel: 30,
    leftFootIndex: 31, rightFootIndex: 32
};

// Key face landmarks for highlighting
const FACE_KEYPOINTS = {
    // Eyes
    leftEyeCenter: 468, // Iris center (if available) or use 133 for left eye center
    rightEyeCenter: 473, // Iris center (if available) or use 362 for right eye center
    leftEyeCorners: [33, 133], // Left eye inner and outer corners
    rightEyeCorners: [362, 263], // Right eye inner and outer corners

    // Nose
    noseTip: 1,
    noseBase: [19, 94],

    // Mouth
    mouthCorners: [61, 291],
    mouthCenter: [13, 14],

    // Face outline key points
    chinTip: 152,
    foreheadCenter: 9,
    cheeks: [116, 345]
};

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

// Body-specific colors
const BODY_CONNECTION_COLOR = 'orange';
const BODY_KEYPOINT_COLORS = {
    face: 'yellow',
    upperBody: 'lime',
    hands: 'cyan',
    lowerBody: 'magenta'
};

// Face-specific colors
const FACE_CONNECTION_COLOR = 'cyan';
const FACE_KEYPOINT_COLORS = {
    eyes: 'lime',
    nose: 'orange',
    mouth: 'red',
    outline: 'cyan'
};
const FACE_BOUNDING_BOX_COLOR = 'magenta';

const LANDMARK_RADIUS = 5;
const LINE_WIDTH = 3;

// Helper function to adjust coordinates for mirror mode
const adjustCoordinateForMirror = (x, mirrorMode) => {
    return mirrorMode ? 1 - x : x;
};

// Helper function to check if camera is in mirror mode
export const isCameraMirrored = (cameraViewElement) => {
    // Check if the video plane has negative scale.x (mirror mode)
    const canvas = cameraViewElement?.querySelector('canvas');
    return canvas?.style.transform?.includes('scaleX(-1)') || false;
};

function CameraView({ stream, onVideoElementReady, handsData, faceData, bodyData, showHands = true, showFaces = true, showBodies = true, mirrorMode = true, onMirrorModeChange }) {
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

    // Notify parent component of mirror mode
    useEffect(() => {
        if (onMirrorModeChange) {
            onMirrorModeChange(mirrorMode);
        }
    }, [mirrorMode, onMirrorModeChange]);

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

                if (!videoW || !videoH || Number.isNaN(videoW) || Number.isNaN(videoH)) {
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

                videoPlaneRef.current.scale.x = mirrorMode ? -1 : 1; // Mirror the video plane based on mirrorMode prop

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
                    if (!videoW || !videoH || Number.isNaN(videoW) || Number.isNaN(videoH))
                        return;
                    const videoAspect = videoW / videoH;
                    const planeHeight = 1;
                    const planeWidth = planeHeight * videoAspect;

                    if (videoPlaneRef.current?.geometry) {
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
                tracks.forEach((track) => { track.stop() });
                videoElement.srcObject = null;
                if (typeof onVideoElementReady === 'function') {
                    onVideoElementReady(null);
                }
            }
            if (
                rendererRef.current?.domElement &&
                mountRef.current?.contains(rendererRef.current.domElement)
            ) {
                mountRef.current.removeChild(rendererRef.current.domElement);
            }
            if (videoTextureRef.current)
                videoTextureRef.current.dispose();
            if (videoPlaneRef.current?.geometry)
                videoPlaneRef.current.geometry.dispose();
            if (videoPlaneRef.current?.material)
                videoPlaneRef.current.material.dispose();
            if (rendererRef.current)
                rendererRef.current.dispose();
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

                if (!videoW || !videoH || Number.isNaN(videoW) || Number.isNaN(videoH)) {
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
    }, [stream, onVideoElementReady, mirrorMode]); // Effect dependencies

    // Effect for ResizeObserver to update overlay canvas dimensions
    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
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

    // Effect for drawing hand and face landmarks
    useEffect(() => {
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;

        // Set canvas physical dimensions for drawing
        canvas.width = overlayWidth;
        canvas.height = overlayHeight;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, overlayWidth, overlayHeight); // Clear previous drawings

        if (overlayWidth === 0 || overlayHeight === 0) {
            return; // Canvas not ready
        }

        // Draw hands if enabled and data available
        if (showHands && handsData && handsData.detectedHands) {
            handsData.detectedHands.forEach(hand => {
                if (hand.landmarks) {
                    // Draw connections first
                    HAND_CONNECTIONS.forEach((connection, index) => {
                        const [startIdx, endIdx] = connection;
                        const startLandmark = hand.landmarks[startIdx];
                        const endLandmark = hand.landmarks[endIdx];

                        if (startLandmark && endLandmark) {
                            const startX = adjustCoordinateForMirror(startLandmark.x, mirrorMode) * overlayWidth;
                            const startY = startLandmark.y * overlayHeight;
                            const endX = adjustCoordinateForMirror(endLandmark.x, mirrorMode) * overlayWidth;
                            const endY = endLandmark.y * overlayHeight;

                            ctx.beginPath();
                            ctx.moveTo(startX, startY);
                            ctx.lineTo(endX, endY);
                            ctx.strokeStyle = CONNECTION_COLORS[index] || 'white';
                            ctx.lineWidth = LINE_WIDTH;
                            ctx.stroke();
                        }
                    });

                    // Draw landmarks on top of connections
                    hand.landmarks.forEach((landmark, index) => {
                        const x = adjustCoordinateForMirror(landmark.x, mirrorMode) * overlayWidth;
                        const y = landmark.y * overlayHeight;
                        const color = FINGERTIP_COLORS[index] || LANDMARK_COLOR;

                        ctx.beginPath();
                        ctx.arc(x, y, LANDMARK_RADIUS, 0, 2 * Math.PI);
                        ctx.fillStyle = color;
                        ctx.fill();
                    });
                }
            });
        }

        // Draw bodies if enabled and data available
        if (showBodies && bodyData && bodyData.detectedBodies) {
            bodyData.detectedBodies.forEach(body => {
                if (body.landmarks) {
                    // Draw body connections first
                    BODY_CONNECTIONS.forEach(connection => {
                        const [startIdx, endIdx] = connection;
                        const startLandmark = body.landmarks[startIdx];
                        const endLandmark = body.landmarks[endIdx];

                        if (startLandmark && endLandmark) {
                            const startX = adjustCoordinateForMirror(startLandmark.x, mirrorMode) * overlayWidth;
                            const startY = startLandmark.y * overlayHeight;
                            const endX = adjustCoordinateForMirror(endLandmark.x, mirrorMode) * overlayWidth;
                            const endY = endLandmark.y * overlayHeight;

                            ctx.beginPath();
                            ctx.moveTo(startX, startY);
                            ctx.lineTo(endX, endY);
                            ctx.strokeStyle = BODY_CONNECTION_COLOR;
                            ctx.lineWidth = LINE_WIDTH;
                            ctx.stroke();
                        }
                    });

                    // Draw key body landmarks with special colors
                    const drawBodyKeypoints = (keypoints, color) => {
                        keypoints.forEach(idx => {
                            if (body.landmarks[idx]) {
                                const x = adjustCoordinateForMirror(body.landmarks[idx].x, mirrorMode) * overlayWidth;
                                const y = body.landmarks[idx].y * overlayHeight;
                                ctx.beginPath();
                                ctx.arc(x, y, LANDMARK_RADIUS + 2, 0, 2 * Math.PI);
                                ctx.fillStyle = color;
                                ctx.fill();
                                // Add border for better visibility
                                ctx.beginPath();
                                ctx.arc(x, y, LANDMARK_RADIUS + 2, 0, 2 * Math.PI);
                                ctx.strokeStyle = 'white';
                                ctx.lineWidth = 1;
                                ctx.stroke();
                            }
                        });
                    };

                    // Draw different body parts with different colors
                    // Face keypoints
                    drawBodyKeypoints([
                        BODY_KEYPOINTS.nose, BODY_KEYPOINTS.leftEye, BODY_KEYPOINTS.rightEye,
                        BODY_KEYPOINTS.leftEar, BODY_KEYPOINTS.rightEar
                    ], BODY_KEYPOINT_COLORS.face);

                    // Upper body keypoints
                    drawBodyKeypoints([
                        BODY_KEYPOINTS.leftShoulder, BODY_KEYPOINTS.rightShoulder,
                        BODY_KEYPOINTS.leftElbow, BODY_KEYPOINTS.rightElbow,
                        BODY_KEYPOINTS.leftWrist, BODY_KEYPOINTS.rightWrist
                    ], BODY_KEYPOINT_COLORS.upperBody);

                    // Hand keypoints
                    drawBodyKeypoints([
                        BODY_KEYPOINTS.leftPinky, BODY_KEYPOINTS.rightPinky,
                        BODY_KEYPOINTS.leftIndex, BODY_KEYPOINTS.rightIndex,
                        BODY_KEYPOINTS.leftThumb, BODY_KEYPOINTS.rightThumb
                    ], BODY_KEYPOINT_COLORS.hands);

                    // Lower body keypoints
                    drawBodyKeypoints([
                        BODY_KEYPOINTS.leftHip, BODY_KEYPOINTS.rightHip,
                        BODY_KEYPOINTS.leftKnee, BODY_KEYPOINTS.rightKnee,
                        BODY_KEYPOINTS.leftAnkle, BODY_KEYPOINTS.rightAnkle,
                        BODY_KEYPOINTS.leftHeel, BODY_KEYPOINTS.rightHeel,
                        BODY_KEYPOINTS.leftFootIndex, BODY_KEYPOINTS.rightFootIndex
                    ], BODY_KEYPOINT_COLORS.lowerBody);
                }
            });
        }

        // Draw faces if enabled and data available
        if (showFaces && faceData && faceData.detectedFaces) {
            faceData.detectedFaces.forEach(face => {
                if (face.landmarks) {
                    // Draw face bounding box if available
                    if (face.boundingBox) {
                        const { xMin, yMin, width, height } = face.boundingBox;
                        const x = mirrorMode ? (1 - (xMin + width)) * overlayWidth : xMin * overlayWidth;
                        const y = yMin * overlayHeight;
                        const w = width * overlayWidth;
                        const h = height * overlayHeight;

                        ctx.beginPath();
                        ctx.rect(x, y, w, h);
                        ctx.strokeStyle = FACE_BOUNDING_BOX_COLOR;
                        ctx.lineWidth = LINE_WIDTH;
                        ctx.stroke();
                    }

                    // Draw face connections
                    FACE_CONNECTIONS.forEach(connection => {
                        const [startIdx, endIdx] = connection;
                        const startLandmark = face.landmarks[startIdx];
                        const endLandmark = face.landmarks[endIdx];

                        if (startLandmark && endLandmark) {
                            const startX = adjustCoordinateForMirror(startLandmark.x, mirrorMode) * overlayWidth;
                            const startY = startLandmark.y * overlayHeight;
                            const endX = adjustCoordinateForMirror(endLandmark.x, mirrorMode) * overlayWidth;
                            const endY = endLandmark.y * overlayHeight;

                            ctx.beginPath();
                            ctx.moveTo(startX, startY);
                            ctx.lineTo(endX, endY);
                            ctx.strokeStyle = FACE_CONNECTION_COLOR;
                            ctx.lineWidth = 1; // Thinner lines for face
                            ctx.stroke();
                        }
                    });

                    // Draw key face landmarks with special colors
                    const drawKeypoints = (indices, color) => {
                        if (Array.isArray(indices)) {
                            indices.forEach(idx => {
                                if (face.landmarks[idx]) {
                                    const x = adjustCoordinateForMirror(face.landmarks[idx].x, mirrorMode) * overlayWidth;
                                    const y = face.landmarks[idx].y * overlayHeight;
                                    ctx.beginPath();
                                    ctx.arc(x, y, LANDMARK_RADIUS + 1, 0, 2 * Math.PI);
                                    ctx.fillStyle = color;
                                    ctx.fill();
                                }
                            });
                        } else if (face.landmarks[indices]) {
                            const x = adjustCoordinateForMirror(face.landmarks[indices].x, mirrorMode) * overlayWidth;
                            const y = face.landmarks[indices].y * overlayHeight;
                            ctx.beginPath();
                            ctx.arc(x, y, LANDMARK_RADIUS + 1, 0, 2 * Math.PI);
                            ctx.fillStyle = color;
                            ctx.fill();
                        }
                    };

                    // Draw key facial features
                    drawKeypoints(FACE_KEYPOINTS.leftEyeCorners, FACE_KEYPOINT_COLORS.eyes);
                    drawKeypoints(FACE_KEYPOINTS.rightEyeCorners, FACE_KEYPOINT_COLORS.eyes);
                    drawKeypoints(FACE_KEYPOINTS.noseTip, FACE_KEYPOINT_COLORS.nose);
                    drawKeypoints(FACE_KEYPOINTS.mouthCorners, FACE_KEYPOINT_COLORS.mouth);
                    drawKeypoints(FACE_KEYPOINTS.mouthCenter, FACE_KEYPOINT_COLORS.mouth);
                }
            });
        }

    }, [handsData, faceData, bodyData, overlayWidth, overlayHeight, showHands, showFaces, showBodies, mirrorMode]);

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
