// Audio processor worklet for microphone input handling
export const SAMPLE_RATE = 16000;
export const PROCESSOR_NAME = 'kortexa-audio-processor';

// Note: worklet code must be standard JavaScript (not TypeScript)
export const WORKLET_CODE = `

class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 512;
        this.buffer = new Float32Array(this.bufferSize);
        this.offset = 0;
    }

    process(inputs, outputs) {
        const input = inputs[0]?.[0];
        if (!input?.length) return true;

        for (let i = 0; i < input.length; i++) {
            this.buffer[this.offset++] = input[i];
            
            if (this.offset === this.bufferSize) {
                this.port.postMessage(this.buffer);
                this.offset = 0;
            }
        }

        return true;
    }
}

registerProcessor('${PROCESSOR_NAME}', AudioProcessor);
`;

// Create worklet URL with proper MIME type and encoding
export function createWorkletUrl(): string {
    const blob = new Blob([WORKLET_CODE], { 
        type: 'application/javascript; charset=utf-8'
    });
    return URL.createObjectURL(blob);
}