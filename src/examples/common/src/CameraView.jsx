import { useEffect, useRef } from "react";
import * as THREE from "three";

function CameraView({ stream, onVideoElementReady }) {
    const mountRef = useRef(null);
    const videoElementRef = useRef(null);
    const rendererRef = useRef(null); // To store renderer instance for cleanup
    const sceneRef = useRef(null); // To store scene instance for cleanup
    const cameraRef = useRef(null); // To store camera instance for cleanup
    const videoTextureRef = useRef(null);
    const videoPlaneRef = useRef(null);
    const animationFrameIdRef = useRef(null);
    const videoMetadataListenerRef = useRef(null);

    useEffect(() => {
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
                                "CameraView: Error re-playing video:",
                                e
                            )
                        );
                };
                videoElement.addEventListener(
                    "loadedmetadata",
                    videoMetadataListenerRef.current
                );
                videoElement
                    .play()
                    .catch((e) =>
                        console.error(
                            "CameraView: Error playing video on stream change:",
                            e
                        )
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

    // The div that Three.js will render into.
    // Its class for styling (e.g., camera-view-container) should be applied by the parent component.
    return <div ref={mountRef} style={{ width: "100%", height: "100%" }}></div>;
}

export default CameraView;
