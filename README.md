# react-multimodal

**Effortlessly Integrate Camera, Microphone, and AI-Powered Body/Hand Tracking into Your React Applications.**

`react-multimodal` is a comprehensive React library designed to simplify the integration of various media inputs and advanced AI-driven tracking capabilities into your web applications. It provides a set of easy-to-use React components and hooks, abstracting away the complexities of managing media streams, permissions, and real-time AI model processing (like MediaPipe for hand and body tracking).

## Why use `react-multimodal`?

-   **Simplified Media Access:** Get up and running with camera and microphone feeds in minutes.
-   **Advanced AI Features:** Seamlessly integrate cutting-edge hand and body tracking without deep AI/ML expertise.
-   **Unified API:** Manage multiple media sources (video, audio, hands, body) through a consistent and declarative API.
-   **React-Friendly:** Built with React developers in mind, leveraging hooks and context for a modern development experience.
-   **Performance Conscious:** Designed to be efficient, especially for real-time AI processing tasks.

## Core Features

`react-multimodal` offers the following key components and hooks:

-   🎥 **`CameraProvider` & `useCamera`**: Access and manage camera video streams. Provides the raw `MediaStream` for direct use or rendering with helper components.
-   🎤 **`MicrophoneProvider` & `useMicrophone`**: Access and manage microphone audio streams. Provides the raw `MediaStream`.
-   🖐️ **`HandsProvider` & `useHands`**: Implements real-time hand tracking using MediaPipe. Provides detailed landmark data for detected hands.
-   🤸 **`BodyProvider` & `useBody`**: (Coming Soon/Conceptual) Intended for real-time body pose estimation.
-   🧩 **`MediaProvider` & `useMedia`**: The central, unified provider. Combines access to camera, microphone, hand tracking, and body tracking. This is the recommended way to use multiple modalities.
    -   Easily enable or disable specific media types (video, audio, hands, body).
    -   Manages underlying providers and their lifecycles.
    -   Provides a consolidated context with all active media data and control functions (`startMedia`, `stopMedia`).

Additionally, there are couple of reusable components in the examples:

-   🖼️ **`CameraView`**: A utility component to easily render a video stream (e.g., from `CameraProvider` or `MediaProvider`) onto a canvas, often used for overlaying tracking visualizations. (`/src/examples/common/src/CameraView.jsx`)
-   🎤 **`MicrophoneView`**: A utility component for a simple visualization of an audio stream (e.g., from `MicrophoneProvider` or `MediaProvider`) onto a canvas, often used for overlaying tracking visualizations. (`/src/examples/common/src/MicrophoneView.jsx`)

## Installation

```bash
npm install @kortexa-ai/react-multimodal
# or
yarn add @kortexa-ai/react-multimodal
```

You will also need to install peer dependencies if you plan to use features like hand tracking:

```bash
npm install @mediapipe/tasks-vision @mediapipe/hands
# or
yarn add @mediapipe/tasks-vision @mediapipe/hands
```

## Getting Started

Here's how you can quickly get started with `react-multimodal`:

### 1. Basic Setup with `MediaProvider`

Wrap your application or relevant component tree with `MediaProvider`.

```jsx
// App.js or your main component
import { MediaProvider } from "@kortexa-ai/react-multimodal";
import MyComponent from "./MyComponent";

function App() {
    return (
        <MediaProvider cameraProps={{}} microphoneProps={{}} handsProps={{}}>
            <MyComponent />
        </MediaProvider>
    );
}

export default App;
```

### 2. Accessing Media Streams and Data

Use the `useMedia` hook within a component wrapped by `MediaProvider`.

```jsx
// MyComponent.jsx
import React, { useEffect, useRef } from "react";
import { useMedia } from "@kortexa-ai/react-multimodal";
// Assuming CameraView is imported from your project or the library's examples
// import CameraView from './CameraView';

function MyComponent() {
    const {
        videoStream,
        audioStream,
        handsData, // Will be null or empty if handsProps is not provided
        isMediaReady,
        isStarting,
        startMedia,
        stopMedia,
        currentVideoError,
        currentAudioError,
        currentHandsError,
    } = useMedia();

    useEffect(() => {
        // Automatically start media when the component mounts
        // Or trigger with a button click: startMedia();
        if (!isMediaReady && !isStarting) {
            startMedia();
        }

        return () => {
            // Clean up when the component unmounts
            stopMedia();
        };
    }, [startMedia, stopMedia, isMediaReady, isStarting]);

    if (currentVideoError)
        return <p>Video Error: {currentVideoError.message}</p>;
    if (currentAudioError)
        return <p>Audio Error: {currentAudioError.message}</p>;
    if (currentHandsError)
        return <p>Hands Error: {currentHandsError.message}</p>;

    return (
        <div>
            <h2>Multimodal Demo</h2>
            <button onClick={startMedia} disabled={isMediaReady || isStarting}>
                {isStarting ? "Starting..." : "Start Media"}
            </button>
            <button onClick={stopMedia} disabled={!isMediaReady}>
                Stop Media
            </button>

            {isMediaReady && videoStream && (
                <div>
                    <h3>Camera Feed</h3>
                    {/* For CameraView, you'd import and use it like: */}
                    {/* <CameraView stream={videoStream} width="640" height="480" /> */}
                    <video
                        ref={(el) => {
                            if (el) el.srcObject = videoStream;
                        }}
                        autoPlay
                        playsInline
                        muted
                        style={{
                            width: "640px",
                            height: "480px",
                            border: "1px solid black",
                        }}
                    />
                </div>
            )}

            {isMediaReady &&
                handsData &&
                handsData.landmarks &&
                handsData.landmarks.length > 0 && (
                    <div>
                        <h3>Hand Landmarks Detected:</h3>
                        <pre>
                            {JSON.stringify(handsData.landmarks, null, 2)}
                        </pre>
                        {/* You would typically use this data to draw on a canvas or trigger interactions */}
                    </div>
                )}

            {isMediaReady && audioStream && <p>Microphone is active.</p>}
            {!isMediaReady && !isStarting && (
                <p>Click "Start Media" to begin.</p>
            )}
        </div>
    );
}

export default MyComponent;
```

### 3. Using Hand Tracking with Overlays

The `handsData` from `useMedia` (if `handsProps` is provided) provides landmarks. You can use these with a `CameraView` component (like the one in `/src/examples/common/src/CameraView.jsx`) or a custom canvas solution to draw overlays.

```jsx
// Conceptual: Inside a component using CameraView for drawing
// import { CameraView } from '@kortexa-ai/react-multimodal/examples'; // Adjust path as needed

// ... (inside a component that has access to videoStream and handsData)
// {isMediaReady && videoStream && (
//   <CameraView
//     stream={videoStream}
//     width="640"
//     height="480"
//     handsData={handsData} // Pass handsData to CameraView for rendering overlays
//   />
// )}
// ...
```

Refer to the `CameraView.jsx` in the examples directory for a practical implementation of drawing hand landmarks.

## API Highlights

### `MediaProvider`

The primary way to integrate multiple media inputs.

**Props:**

-   `cameraProps?: UseCameraProps` (optional): Provide an object (even an empty `{}`) to enable camera functionality. Omit or pass `undefined` to disable. Refer to `UseCameraProps` (from `src/camera/useCamera.ts`) for configurations like `defaultFacingMode`, `requestedWidth`, etc.
-   `microphoneProps?: UseMicrophoneProps` (optional): Provide an object (even an empty `{}`) to enable microphone functionality. Omit or pass `undefined` to disable. Refer to `UseMicrophoneProps` (from `src/microphone/types.ts`) for configurations like `sampleRate`.
-   `handsProps?: UseHandsProps` (optional): Provide an object (even an empty `{}`) to enable hand tracking. Omit or pass `undefined` to disable. The `UseHandsProps` (from `src/hands/types.ts`) includes an `options` field for MediaPipe settings (e.g., `maxNumHands`, `modelComplexity`).
-   `bodyProps?: any` (optional, future): Configuration for body tracking. Provide an object to enable, omit to disable.
-   `startBehavior?: "proceed" | "halt"` (optional, default: `"proceed"`): Advanced setting to control initial auto-start behavior within the orchestrator.
-   `onMediaReady?: () => void`: Callback when all requested media streams are active.
-   `onMediaError?: (errorType: 'video' | 'audio' | 'hands' | 'body' | 'general', error: Error) => void`: Callback for media errors, specifying the type of error.

**Context via `useMedia()`:**

-   `videoStream?: MediaStream`: The camera video stream.
-   `audioStream?: MediaStream`: The microphone audio stream.
-   `handsData?: HandsData`: Hand tracking results from MediaPipe.
    -   `HandsData`: Typically `{ landmarks: NormalizedLandmark[][], worldLandmarks: Landmark[][], handedness: Handedness[][] }` (refer to MediaPipe `Results` type for `hands` task).
-   `bodyData?: any`: Body tracking results (future).
-   `isMediaReady: boolean`: True if all requested media streams are active and ready.
-   `isStarting: boolean`: True if media is currently in the process of starting.
-   `startMedia: () => Promise<void>`: Function to initialize and start all enabled media.
-   `stopMedia: () => void`: Function to stop all active media and release resources.
-   `currentVideoError?: Error`: Current error related to video.
-   `currentAudioError?: Error`: Current error related to audio.
-   `currentHandsError?: Error`: Current error related to hand tracking.
-   `currentBodyError?: Error`: Current error related to body tracking (future).

### Standalone Providers (e.g., `HandsProvider`, `CameraProvider`)

While `MediaProvider` is recommended for most use cases, individual providers like `HandsProvider` or `CameraProvider` can be used if you only need a specific modality. They offer a more focused context (e.g., `useHands()` for `HandsProvider`, `useCamera()` for `CameraProvider`). Their API structure is similar, providing specific data, ready states, start/stop functions, and error states for their respective modality.

## Examples

For more detailed and interactive examples, please check out the `/examples` directory within this repository. It includes demonstrations of:

-   Using `MediaProvider` with `CameraView`.
-   Visualizing hand landmarks and connections.
-   Controlling media start/stop and handling states.

## Troubleshooting

Don't forget to deduplicate @mediapipe in your vite config:

```ts
resolve: {
    dedupe: [
        "react",
        "react-dom",
        "@kortexa-ai/react-multimodal",
        "@mediapipe/hands",
        "@mediapipe/tasks-vision",
    ];
}
```

---

© 2025 kortexa.ai
