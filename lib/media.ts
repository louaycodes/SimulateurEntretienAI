// Media Stream Helpers

export async function getMediaStream(
    constraints: MediaStreamConstraints = { video: true, audio: true }
): Promise<MediaStream> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        return stream;
    } catch (error) {
        console.error("Failed to get media stream:", error);
        throw new Error(
            `Failed to access camera/microphone: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

export function stopMediaStream(stream: MediaStream): void {
    stream.getTracks().forEach((track) => {
        track.stop();
    });
}

export async function enumerateDevices(): Promise<MediaDeviceInfo[]> {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices;
    } catch (error) {
        console.error("Failed to enumerate devices:", error);
        throw new Error("Failed to enumerate media devices");
    }
}

export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await enumerateDevices();
    return devices.filter((device) => device.kind === "audioinput");
}

export async function getVideoInputDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await enumerateDevices();
    return devices.filter((device) => device.kind === "videoinput");
}

// MediaRecorder Helpers

export interface RecorderOptions {
    mimeType?: string;
    audioBitsPerSecond?: number;
    onDataAvailable?: (blob: Blob) => void;
    timeslice?: number;
}

export function createMediaRecorder(
    stream: MediaStream,
    options: RecorderOptions = {}
): MediaRecorder {
    const {
        mimeType = "audio/webm",
        audioBitsPerSecond = 128000,
        onDataAvailable,
        timeslice = 1000,
    } = options;

    let recorder: MediaRecorder;

    try {
        recorder = new MediaRecorder(stream, {
            mimeType,
            audioBitsPerSecond,
        });
    } catch (error) {
        // Fallback to default mime type
        console.warn("Failed to create MediaRecorder with specified mimeType, using default");
        recorder = new MediaRecorder(stream);
    }

    if (onDataAvailable) {
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                onDataAvailable(event.data);
            }
        };
    }

    return recorder;
}

export function startRecording(recorder: MediaRecorder, timeslice: number = 1000): void {
    if (recorder.state === "inactive") {
        recorder.start(timeslice);
    }
}

export function stopRecording(recorder: MediaRecorder): void {
    if (recorder.state !== "inactive") {
        recorder.stop();
    }
}

export function pauseRecording(recorder: MediaRecorder): void {
    if (recorder.state === "recording") {
        recorder.pause();
    }
}

export function resumeRecording(recorder: MediaRecorder): void {
    if (recorder.state === "paused") {
        recorder.resume();
    }
}

// Blob/Base64 Conversion

export async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:audio/webm;base64,")
            const base64 = result.split(",")[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export function base64ToBlob(base64: string, mimeType: string = "audio/webm"): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

// Audio Level Detection

export function createAudioLevelDetector(
    stream: MediaStream,
    onLevel: (level: number) => void
): () => void {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 1024;

    microphone.connect(analyser);

    let animationId: number;

    const detectLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const level = Math.min(100, (average / 255) * 100);
        onLevel(level);
        animationId = requestAnimationFrame(detectLevel);
    };

    detectLevel();

    // Return cleanup function
    return () => {
        cancelAnimationFrame(animationId);
        microphone.disconnect();
        audioContext.close();
    };
}
