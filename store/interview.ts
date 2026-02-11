import { create } from "zustand";
import { ConversationMessage, SessionConfig } from "@/lib/types";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";
type RecordingState = "inactive" | "recording" | "paused";
type InterviewStatus = "idle" | "connecting" | "interviewing" | "paused" | "ended";
type RecruiterState = "idle" | "listening" | "thinking" | "speaking";

interface PrivateNote {
    timestamp: number;
    signals: string[];
    score_hint: {
        total: number;
        technical: number;
        communication: number;
        problem_solving: number;
    };
}

interface InterviewState {
    sessionId: string | null;
    config: SessionConfig | null;
    status: InterviewStatus;
    recruiterState: RecruiterState;
    connectionStatus: ConnectionStatus;
    recordingState: RecordingState;
    messages: ConversationMessage[];
    partialTranscript: string;
    liveInterim: string;
    elapsedTime: number;
    audioLevel: number;
    privateNotes: PrivateNote[];
    isListening: boolean;
    streamingText: string;
    hasInitialized: boolean;
    lastSentTranscript: string;
    lastSentTimestamp: number;
    isRecruiterSpeaking: boolean;

    // Utterance aggregation & request control
    utteranceBuffer: string;
    silenceTimerId: NodeJS.Timeout | null;
    requestInFlight: boolean;
    blockedUntil: number;
    lastSentNormalized: string;
    requestCounter: number;

    // Preparation screen
    preloadedResponse: { say: string; evaluation?: any } | null;
    demoMode: boolean;

    // Actions
    setSessionId: (id: string) => void;
    setConfig: (config: SessionConfig) => void;
    setStatus: (status: InterviewStatus) => void;
    setRecruiterState: (state: RecruiterState) => void;
    setConnectionStatus: (status: ConnectionStatus) => void;
    setRecordingState: (state: RecordingState) => void;
    addMessage: (message: ConversationMessage) => void;
    setPartialTranscript: (text: string) => void;
    clearPartialTranscript: () => void;
    setLiveInterim: (text: string) => void;
    clearLiveInterim: () => void;
    setElapsedTime: (time: number) => void;
    setAudioLevel: (level: number) => void;
    addPrivateNote: (note: PrivateNote) => void;
    setIsListening: (listening: boolean) => void;
    setStreamingText: (text: string) => void;
    appendStreamingText: (text: string) => void;
    clearStreamingText: () => void;
    setHasInitialized: (initialized: boolean) => void;
    setLastSentTranscript: (text: string, timestamp: number) => void;
    setIsRecruiterSpeaking: (speaking: boolean) => void;

    // Utterance aggregation & request control
    appendUtteranceBuffer: (text: string) => void;
    clearUtteranceBuffer: () => void;
    setSilenceTimerId: (id: NodeJS.Timeout | null) => void;
    setRequestInFlight: (inFlight: boolean) => void;
    setBlockedUntil: (timestamp: number) => void;
    setLastSentNormalized: (text: string) => void;
    incrementRequestCounter: () => void;

    // Preparation screen
    setPreloadedResponse: (resp: { say: string; evaluation?: any } | null) => void;
    setDemoMode: (demo: boolean) => void;

    reset: () => void;
}

const initialState = {
    sessionId: null,
    config: null,
    status: "idle" as InterviewStatus,
    recruiterState: "idle" as RecruiterState,
    connectionStatus: "disconnected" as ConnectionStatus,
    recordingState: "inactive" as RecordingState,
    messages: [],
    partialTranscript: "",
    liveInterim: "",
    elapsedTime: 0,
    audioLevel: 0,
    privateNotes: [],
    isListening: false,
    streamingText: "",
    hasInitialized: false,
    lastSentTranscript: "",
    lastSentTimestamp: 0,
    isRecruiterSpeaking: false,

    // Utterance aggregation & request control
    utteranceBuffer: "",
    silenceTimerId: null as NodeJS.Timeout | null,
    requestInFlight: false,
    blockedUntil: 0,
    lastSentNormalized: "",
    requestCounter: 0,

    // Preparation screen
    preloadedResponse: null as { say: string; evaluation?: any } | null,
    demoMode: false,
};

export const useInterviewStore = create<InterviewState>((set) => ({
    ...initialState,

    setSessionId: (id) => set({ sessionId: id }),
    setConfig: (config) => set({ config }),
    setStatus: (status) => set({ status }),
    setRecruiterState: (state) => set({ recruiterState: state }),
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    setRecordingState: (state) => set({ recordingState: state }),

    addMessage: (message) =>
        set((state) => ({
            messages: [...state.messages, message],
        })),

    setPartialTranscript: (text) => set({ partialTranscript: text }),
    clearPartialTranscript: () => set({ partialTranscript: "" }),

    setLiveInterim: (text) => set({ liveInterim: text }),
    clearLiveInterim: () => set({ liveInterim: "" }),

    setElapsedTime: (time) => set({ elapsedTime: time }),
    setAudioLevel: (level) => set({ audioLevel: level }),

    addPrivateNote: (note) =>
        set((state) => ({
            privateNotes: [...state.privateNotes, note],
        })),

    setIsListening: (listening) => set({ isListening: listening }),

    setStreamingText: (text) => set({ streamingText: text }),
    appendStreamingText: (text) =>
        set((state) => ({
            streamingText: state.streamingText + text,
        })),
    clearStreamingText: () => set({ streamingText: "" }),

    setHasInitialized: (initialized) => set({ hasInitialized: initialized }),
    setLastSentTranscript: (text, timestamp) => set({ lastSentTranscript: text, lastSentTimestamp: timestamp }),
    setIsRecruiterSpeaking: (speaking) => set({ isRecruiterSpeaking: speaking }),

    // Utterance aggregation & request control
    appendUtteranceBuffer: (text) => set((state) => ({
        utteranceBuffer: state.utteranceBuffer ? `${state.utteranceBuffer} ${text}`.trim() : text
    })),
    clearUtteranceBuffer: () => set({ utteranceBuffer: "" }),
    setSilenceTimerId: (id) => set({ silenceTimerId: id }),
    setRequestInFlight: (inFlight) => set({ requestInFlight: inFlight }),
    setBlockedUntil: (timestamp) => set({ blockedUntil: timestamp }),
    setLastSentNormalized: (text) => set({ lastSentNormalized: text }),
    incrementRequestCounter: () => set((state) => ({ requestCounter: state.requestCounter + 1 })),

    // Preparation screen
    setPreloadedResponse: (resp) => set({ preloadedResponse: resp }),
    setDemoMode: (demo) => set({ demoMode: demo }),

    reset: () => set(initialState),
}));
