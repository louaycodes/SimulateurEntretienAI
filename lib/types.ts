// WebSocket Message Types

export type Role = "DevOps" | "Cloud" | "Backend" | "Cybersecurity" | "Data";
export type Level = "junior" | "mid" | "senior";
export type InterviewType = "HR" | "Tech" | "Mixed";
export type Language = "FR" | "EN";

// LLM Types
export type LLMProvider = "groq";

// Incoming WebSocket Messages
export interface RecruiterQuestionMessage {
    type: "recruiter_question";
    id: string;
    text: string;
    ts: number;
}

export interface RecruiterFollowupMessage {
    type: "recruiter_followup";
    id: string;
    text: string;
    ts: number;
}

export interface PartialTranscriptMessage {
    type: "partial_transcript";
    text: string;
    ts: number;
}

export interface FinalTranscriptMessage {
    type: "final_transcript";
    text: string;
    ts: number;
}

export interface SessionEndSummaryMessage {
    type: "session_end_summary";
    sessionId: string;
    summary: string;
    scores: {
        overall: number;
        technical: number;
        communication: number;
        problemSolving: number;
        experience: number;
    };
    tips: string[];
}

export interface ErrorMessage {
    type: "error";
    code: string;
    message: string;
}

export type IncomingMessage =
    | RecruiterQuestionMessage
    | RecruiterFollowupMessage
    | PartialTranscriptMessage
    | FinalTranscriptMessage
    | SessionEndSummaryMessage
    | ErrorMessage;

// Outgoing WebSocket Messages
export interface StartSessionPayload {
    role: Role;
    level: Level;
    interviewType: InterviewType;
    language: Language;
    durationSec: number;
}

export interface AudioChunkPayload {
    sessionId: string;
    mimeType: string;
    chunkBase64: string;
    seq: number;
    ts: number;
}

export interface UserEventPayload {
    sessionId: string;
    event: "pause" | "resume" | "end";
}

export interface RequestRepeatPayload {
    sessionId: string;
}

export interface RequestClarifyPayload {
    sessionId: string;
}

export interface StartSessionMessage {
    type: "start_session";
    payload: StartSessionPayload;
}

export interface AudioChunkMessage {
    type: "audio_chunk";
    payload: AudioChunkPayload;
}

export interface UserEventMessage {
    type: "user_event";
    payload: UserEventPayload;
}

export interface RequestRepeatMessage {
    type: "request_repeat";
    payload: RequestRepeatPayload;
}

export interface RequestClarifyMessage {
    type: "request_clarify";
    payload: RequestClarifyPayload;
}

export type OutgoingMessage =
    | StartSessionMessage
    | AudioChunkMessage
    | UserEventMessage
    | RequestRepeatMessage
    | RequestClarifyMessage;

// Session Types
export interface ConversationMessage {
    id: string;
    type: "recruiter" | "user";
    text: string;
    timestamp: number;
}

export interface SessionConfig {
    role: Role;
    level: Level;
    interviewType: InterviewType;
    language: Language;
    duration: number;
}


export type InterviewConfig = SessionConfig;

export interface SessionData {
    id: string;
    status: "running" | "ended" | "paused"; // Add status
    config: SessionConfig;
    startTime: number;
    endTime?: number;
    transcript: ConversationMessage[];
    scores?: {
        overall: number;
        technical: number;
        communication: number;
        problemSolving: number;
        experience: number;
    };
    feedback?: {
        strengths: string[];
        improvements: string[];
        impression: "Hire" | "Lean Hire" | "No Hire";
    };
    timeline?: TimelineEvent[];
}

export interface TimelineEvent {
    timestamp: number;
    label: string;
    description: string;
}

// Device Types
export interface MediaDeviceInfo {
    deviceId: string;
    label: string;
    kind: MediaDeviceKind;
}

// User Preferences
export interface UserPreferences {
    language: Language;
    ttsEnabled: boolean;
    autoSubtitles: boolean;
    showGazeTips: boolean;
    selectedAudioInput?: string;
    selectedVideoInput?: string;
}

// Auth Types (fake)
export interface User {
    id: string;
    email: string;
    name: string;
    createdAt: number;
}
