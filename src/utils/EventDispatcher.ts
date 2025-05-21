// Generic event handling with type safety
export interface EventListener<T> {
    id: string;
    listener: (data?: T) => void | Promise<void>;
}

export class EventDispatcher<EventMap extends Record<string, unknown>> {
    private listeners: Map<keyof EventMap, Map<string, EventListener<unknown>>> = new Map();

    addListener<E extends keyof EventMap>(
        eventType: E, 
        listener: EventListener<EventMap[E]>
    ): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Map());
        }
        // Type assertion here is safe because we know the event type matches
        const eventListeners = this.listeners.get(eventType)!;
        eventListeners.set(listener.id, listener as EventListener<unknown>);
    }

    removeListener(eventType: keyof EventMap, id: string): void {
        const eventListeners = this.listeners.get(eventType);
        if (eventListeners) {
            eventListeners.delete(id);
        }
    }

    async dispatch<E extends keyof EventMap>(
        eventType: E, 
        data?: EventMap[E]
    ): Promise<void> {
        const eventListeners = this.listeners.get(eventType);
        if (!eventListeners) return;

        const promises: Promise<void>[] = [];

        eventListeners.forEach(listener => {
            try {
                // Type assertion here because we know the listeners matches the event type
                const typedListener = listener as EventListener<EventMap[E]>;
                const result = typedListener.listener(data);
                if (result instanceof Promise) {
                    promises.push(result);
                }
            } catch (error) {
                console.error(`Error in ${String(eventType)} listener ${listener.id}:`, error);
            }
        });

        if (promises.length > 0) {
            await Promise.all(promises);
        }
    }

    clear(eventType?: keyof EventMap): void {
        if (eventType) {
            this.listeners.delete(eventType as string);
        } else {
            this.listeners.clear();
        }
    }

    getListenerCount(eventType: keyof EventMap): number {
        return this.listeners.get(eventType as string)?.size ?? 0;
    }
}

// Microphone specific events type map
export interface MicrophoneEventMap extends Record<string, unknown> {
    audioData: Float32Array;
    start: void;
    stop: void;
    error: string;
}

// Microphone event dispatcher instance
export const microphoneDispatcher = new EventDispatcher<MicrophoneEventMap>();

// Camera specific events type map
export interface CameraEventMap extends Record<string, unknown> {
    streamChanged: MediaStream | null;
    started: void;
    stopped: void;
    facingModeChanged: 'user' | 'environment';
    error: string;
}

// Camera event dispatcher instance
export const cameraDispatcher = new EventDispatcher<CameraEventMap>();