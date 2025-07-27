# Changelog

All notable changes to this project will be documented in this file.

## [0.1.5] - 2025-06-26

### Added
- Built-in gesture recognition using MediaPipe Tasks Vision
- Support for 12 common hand gestures (pointing, thumbs up/down, victory, etc.)
- New `enableGestures` prop to toggle gesture recognition
- New `gestureOptions` for fine-tuning gesture detection
- New `onGestureResults` callback for gesture-specific events
- `GestureResult` type for gesture detection results

### Changed
- **BREAKING**: Migrated from `@mediapipe/hands` to `@mediapipe/tasks-vision`
- **BREAKING**: `DetectedHand.handedness` changed from `Handedness[]` to single `Handedness`
- **BREAKING**: Updated `HandsData` structure to use `detectedHands` array
- Updated all MediaPipe type definitions to use native MediaPipe types
- Enhanced `HandsProviderProps` with gesture-specific configuration

### Removed
- Dependency on `@mediapipe/hands` (replaced by `@mediapipe/tasks-vision`)
- Legacy MediaPipe Hands initialization code

### Fixed
- Type compatibility issues with MediaPipe Tasks Vision API
- Build errors related to type mismatches

## [0.2.0] - 2025-07-27

### Added
- Support for body tracking using MediaPipe Tasks Vision
- Support for face tracking using MediaPipe Tasks Vision

### Changed
- Updated the CompositeMediaProvider interfaces to support body and face tracking

### Fixed
- Tracking data and camera orientation in examples

## [0.1.3] - 2025-05-27

### Changed
- Changes to the CompositeMediaProvider interfaces

## [0.1.2] - 2025-05-27

### Added
- Streamlined the providers to same interface model

### Changed
- Changed the MediaProvider to CompositeMediaProvider

### Fixed
- Fixed an issue with internal Camera-Hands state management

## [0.1.1] - 2025-05-26

### Fixed
- Fixed the package model

## [0.1.0] - 2025-05-15

### Added
- Initial public release
