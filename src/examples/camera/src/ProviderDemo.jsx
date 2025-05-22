import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { useCameraControl } from "../../../index";
import StatusDot from '../../common/StatusDot';
import { Camera, CameraOff } from "lucide-react";

const ProviderDemo = () => {
    const cam = useCameraControl();
    const mountRef = useRef(null);
    const videoElementRef = useRef(null); // For the <video> element
    const videoTextureRef = useRef(null);
    const videoPlaneRef = useRef(null);
    const animationFrameIdRef = useRef(null);
    const videoMetadataListenerRef = useRef(null); // Ref for the metadata listener

    const [isCameraOn, setIsCameraOn] = useState(cam.isOn);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        // Create video element dynamically if it doesn't exist or ensure it's the right one
        let videoElement = videoElementRef.current;
        if (!videoElement) {
            videoElement = document.createElement("video");
            videoElement.playsInline = true;
            videoElement.muted = true; // Important for autoplay policies
            videoElementRef.current = videoElement;
        }

        let scene, camera, renderer; // Keep these local to useEffect setup scope

        const initThreeJS = (stream) => {
            if (!currentMount || !videoElementRef.current) return;
            currentMount.innerHTML = ""; // Clear previous canvas

            const localVideoElement = videoElementRef.current;
            localVideoElement.srcObject = stream;

            const width = currentMount.clientWidth;
            const height = currentMount.clientHeight;

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            camera.position.z = 1; // Adjust as needed

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(width, height);
            currentMount.appendChild(renderer.domElement);

            videoTextureRef.current = new THREE.VideoTexture(localVideoElement);

            const onVideoMetadataLoaded = () => {
                if (!scene || !videoTextureRef.current || !localVideoElement)
                    return;

                if (videoPlaneRef.current) {
                    scene.remove(videoPlaneRef.current);
                    if (videoPlaneRef.current.geometry)
                        videoPlaneRef.current.geometry.dispose();
                    // Material using VideoTexture doesn't strictly need disposal if texture is updated/reused
                    videoPlaneRef.current = null;
                }

                const videoW = localVideoElement.videoWidth;
                const videoH = localVideoElement.videoHeight;

                if (!videoW || !videoH || isNaN(videoW) || isNaN(videoH)) {
                    console.error(
                        "Camera Example: Invalid video dimensions on loadedmetadata.",
                        "Width:",
                        videoW,
                        "Height:",
                        videoH
                    );
                    return;
                }
                const videoAspect = videoW / videoH;

                const planeHeight = 1;
                const planeWidth = planeHeight * videoAspect;

                const geometry = new THREE.PlaneGeometry(
                    planeWidth,
                    planeHeight
                );
                const material = new THREE.MeshBasicMaterial({
                    map: videoTextureRef.current,
                });
                const newVideoPlane = new THREE.Mesh(geometry, material);
                videoPlaneRef.current = newVideoPlane;
                scene.add(newVideoPlane);

                if (camera) camera.lookAt(newVideoPlane.position);

                // Play the video now that metadata is loaded and geometry is ready
                localVideoElement
                    .play()
                    .catch((e) =>
                        console.error(
                            "Error playing video after metadata loaded:",
                            e
                        )
                    );
            };

            localVideoElement.addEventListener(
                "loadedmetadata",
                onVideoMetadataLoaded
            );
            videoMetadataListenerRef.current = onVideoMetadataLoaded; // Store for cleanup

            const animate = () => {
                animationFrameIdRef.current = requestAnimationFrame(animate);
                // VideoTexture updates automatically if the video is playing.
                // if (videoTextureRef.current) videoTextureRef.current.needsUpdate = true;
                if (renderer && scene && camera) renderer.render(scene, camera);
            };
            animate();
        };

        const handleStreamChange = (stream) => {
            setErrorMessage("");
            const localVideoElement = videoElementRef.current;
            if (stream) {
                if (!renderer) {
                    // If Three.js isn't initialized yet
                    initThreeJS(stream);
                } else if (localVideoElement) {
                    // If already initialized, just update srcObject
                    localVideoElement.srcObject = stream;
                    // The 'loadedmetadata' listener should handle plane recreation and playing.
                }
            } else {
                if (animationFrameIdRef.current)
                    cancelAnimationFrame(animationFrameIdRef.current);
                if (localVideoElement && localVideoElement.srcObject) {
                    const tracks = localVideoElement.srcObject.getTracks();
                    tracks.forEach((track) => track.stop());
                    localVideoElement.srcObject = null;
                }
                if (videoPlaneRef.current && scene) {
                    scene.remove(videoPlaneRef.current);
                    if (videoPlaneRef.current.geometry)
                        videoPlaneRef.current.geometry.dispose();
                    videoPlaneRef.current = null;
                }
                // Don't dispose renderer/scene here, stream might come back.
            }
        };

        const streamListenerId =
            cam.addStreamChangedListener(handleStreamChange);
        // Initial call if stream already exists
        if (cam.stream) {
            handleStreamChange(cam.stream);
        } else if (renderer) {
            // If no stream but renderer exists, perform cleanup similar to !stream in handleStreamChange
            handleStreamChange(null);
        }

        const handleCameraStarted = () => {
            setIsCameraOn(true);
        };
        const handleCameraStopped = () => {
            setIsCameraOn(false);
            setErrorMessage(""); // Clear errors when camera stops
        };
        const handleCameraError = (error) => {
            setErrorMessage(
                error.message || "An unknown camera error occurred."
            );
            setIsCameraOn(false);
        };

        const startListenerId = cam.addStartedListener(handleCameraStarted);
        const stopListenerId = cam.addStoppedListener(handleCameraStopped);
        const errorListenerId = cam.addErrorListener(handleCameraError);

        const handleResize = () => {
            if (camera && renderer && currentMount) {
                const width = currentMount.clientWidth;
                const height = currentMount.clientHeight;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            }
        };
        window.addEventListener("resize", handleResize);

        return () => {
            cam.removeStreamChangedListener(streamListenerId);
            cam.removeStartedListener(startListenerId);
            cam.removeStoppedListener(stopListenerId);
            cam.removeErrorListener(errorListenerId);
            window.removeEventListener("resize", handleResize);

            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }

            const currentLocalVideoElement = videoElementRef.current;
            const currentMetaListener = videoMetadataListenerRef.current;
            if (currentLocalVideoElement && currentMetaListener) {
                currentLocalVideoElement.removeEventListener(
                    "loadedmetadata",
                    currentMetaListener
                );
                videoMetadataListenerRef.current = null;
            }

            if (videoPlaneRef.current) {
                if (videoPlaneRef.current.geometry)
                    videoPlaneRef.current.geometry.dispose();
                if (videoPlaneRef.current.material)
                    videoPlaneRef.current.material.dispose();
                if (scene && videoPlaneRef.current.parent === scene)
                    scene.remove(videoPlaneRef.current);
                videoPlaneRef.current = null;
            }
            if (videoTextureRef.current) {
                videoTextureRef.current.dispose();
                videoTextureRef.current = null;
            }
            if (renderer) {
                renderer.dispose();
                if (
                    renderer.domElement &&
                    currentMount.contains(renderer.domElement)
                ) {
                    currentMount.removeChild(renderer.domElement);
                }
            }
            // Scene children are disposed via videoPlaneRef, other objects are local
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
            }
        }
    }, [cam]);

    return (
        <div className="card-container">
            <h2 className="card-title">Camera Provider Demo</h2>
            <div ref={mountRef} className="camera-view-container"></div>
            {errorMessage && (
                <p className="error-message">Error: {errorMessage}</p>
            )}
            <div className="button-row">
                <button onClick={handleToggleCamera}>
                    {isCameraOn ? <CameraOff /> : <Camera />}
                </button>
                <StatusDot isActive={isCameraOn} />
            </div>
        </div>
    );
};

export default ProviderDemo;
