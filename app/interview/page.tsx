"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    Phone,
    Play,
    Pause,
    RotateCcw,
    MessageCircle,
    Keyboard,
    History,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useInterviewStore } from "@/store/interview";
import { usePreferencesStore } from "@/store/preferences";
import {
    getMediaStream,
    stopMediaStream,
    createAudioLevelDetector,
} from "@/lib/media";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { RecruiterAvatar } from "@/components/RecruiterAvatar";
import { TranscriptLive, StreamingMessage } from "@/components/TranscriptLive";
import { createSpeechRecognition, TextInputRecognition } from "@/lib/speech";
import { GeminiClient } from "@/lib/geminiClient";
import { buildInterviewSystemPrompt } from "@/lib/prompts";
import FilmTranscript from "@/components/FilmTranscript"; // Keep for now or remove if fully replaced
import SubtitlesOverlay from "@/components/SubtitlesOverlay";
import TranscriptModal from "@/components/TranscriptModal";
import { useTTSStore } from "@/store/ttsStore";
import * as TTS from "@/lib/tts";

export default function InterviewPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const cleanupAudioLevelRef = useRef<(() => void) | null>(null);
    const speechRecognitionRef = useRef<any>(null);
    const geminiClientRef = useRef<GeminiClient | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [useSpeechRecognition, setUseSpeechRecognition] = useState(true);
    const [manualInput, setManualInput] = useState("");
    const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);

    const {
        sessionId,
        config,
        status,
        recruiterState,
        messages,
        liveInterim,
        elapsedTime,
        audioLevel,
        streamingText,
        hasInitialized,
        isRecruiterSpeaking,
        setStatus,
        setRecruiterState,
        addMessage,
        setLiveInterim,
        clearLiveInterim,
        setElapsedTime,
        setAudioLevel,
        addPrivateNote,
        setStreamingText,
        appendStreamingText,
        clearStreamingText,
        setHasInitialized,
        setIsRecruiterSpeaking,
        reset,
    } = useInterviewStore();

    const { selectedAudioInput, selectedVideoInput, language } = usePreferencesStore();

    const {
        enabled: ttsEnabled,
        voiceURI,
        rate: ttsRate,
        pitch: ttsPitch,
        volume: ttsVolume,
        isSpeaking: ttsIsSpeaking,
        lastSpokenMessageId,
        setIsSpeaking: setTTSIsSpeaking,
        setLastSpokenMessageId,
    } = useTTSStore();

    // Timer
    useEffect(() => {
        if (status === "interviewing") {
            const interval = setInterval(() => {
                setElapsedTime(elapsedTime + 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [status, elapsedTime, setElapsedTime]);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamingText, liveInterim]);

    // Initialize media with echo cancellation
    useEffect(() => {
        const initMedia = async () => {
            try {
                const constraints: MediaStreamConstraints = {
                    video: selectedVideoInput ? { deviceId: selectedVideoInput } : true,
                    audio: {
                        deviceId: selectedAudioInput || undefined,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                };

                const stream = await getMediaStream(constraints);
                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                // Setup audio level detector
                const cleanup = createAudioLevelDetector(stream, (level) => {
                    setAudioLevel(level);
                });
                cleanupAudioLevelRef.current = cleanup;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Checking permissions...";
                showToast("error", `Camera/Mic Error: ${errorMessage}`);
                console.error("Media initialization failed:", error);
            }
        };

        if (status !== 'ended') {
            initMedia();
        }

        return () => {
            if (streamRef.current) {
                stopMediaStream(streamRef.current);
            }
            if (cleanupAudioLevelRef.current) {
                cleanupAudioLevelRef.current();
            }
        };
    }, [selectedAudioInput, selectedVideoInput, showToast, setAudioLevel, status]);

    // Initialize Gemini client
    useEffect(() => {
        geminiClientRef.current = new GeminiClient();
    }, []);

    // Generate next recruiter question or initialize interview
    const generateRecruiterQuestion = useCallback(async (candidateText?: string) => {
        if (!config || !sessionId) return;

        setRecruiterState("thinking");

        try {
            // Determine if this is initialization or a turn
            const isInitialization = !hasInitialized;

            // Prepare request
            const requestBody: any = {
                sessionId,
                interviewParams: config,
                isInit: isInitialization,
                messages: messages.map((msg: any) => ({
                    role: msg.type === "recruiter" ? ("assistant" as const) : ("user" as const),
                    content: msg.text,
                }))
            };

            // Add candidate text for non-init turns
            if (!isInitialization && candidateText) {
                requestBody.candidateText = candidateText;
            }

            console.log(`[Interview] ${isInitialization ? 'Initializing' : 'Next turn'} for session ${sessionId}`);

            // Call API
            const response = await fetch('/api/interview/next-turn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            const result = await response.json();

            if (!result.ok) {
                const error = result.error;
                throw new Error(`${error.message}\n\nHint: ${error.hint}`);
            }

            const data = result.data;

            // Mark as initialized
            if (isInitialization) {
                setHasInitialized(true);
                console.log('[Interview] Session initialized');
            }

            // Store private notes with evaluation
            addPrivateNote({
                timestamp: Date.now(),
                signals: data.evaluation.signals,
                score_hint: {
                    total: data.evaluation.total_score,
                    technical: data.evaluation.technical_score,
                    communication: data.evaluation.communication_score,
                    problem_solving: data.evaluation.problem_solving_score,
                },
            });

            // Simulate streaming for UX
            setRecruiterState("speaking");
            clearStreamingText();

            const words = data.say.split(' ');
            for (const word of words) {
                appendStreamingText(word + ' ');
                await new Promise(resolve => setTimeout(resolve, 30));
            }

            // Add recruiter message
            addMessage({
                id: Date.now().toString(),
                type: "recruiter",
                text: data.say,
                timestamp: Date.now(),
            });

            clearStreamingText();
            setRecruiterState("listening");

        } catch (error) {
            console.error("Failed to generate question:", error);
            console.error("Interview Config:", config);
            showToast("error", error instanceof Error ? error.message : "Failed to generate question. Check API connection.");
            setRecruiterState("idle");
        }
    }, [config, sessionId, hasInitialized, messages, setRecruiterState, addMessage, addPrivateNote, showToast, appendStreamingText, clearStreamingText, setHasInitialized]);

    // Auto-generate first question when interview starts
    useEffect(() => {
        if (status === "interviewing" && messages.length === 0 && config) {
            // Recruiter speaks first!
            generateRecruiterQuestion();
        }
    }, [status, messages.length, config, generateRecruiterQuestion]);

    // TTS: Speak recruiter messages
    useEffect(() => {
        if (!ttsEnabled || !TTS.isSupported()) return;

        // Find last recruiter message
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.type !== 'recruiter') return;

        // Prevent duplicate speaking
        if (lastMessage.id === lastSpokenMessageId) return;

        // Speak the message
        const lang = config?.language === 'FR' ? 'fr-FR' : 'en-US';

        console.log(`[TTS] Speaking recruiter message: "${lastMessage.text.substring(0, 50)}..."`);

        TTS.speak(lastMessage.text, {
            voiceURI: voiceURI || undefined,
            rate: ttsRate,
            pitch: ttsPitch,
            volume: ttsVolume,
            lang,
            onStart: () => {
                setTTSIsSpeaking(true);
                setRecruiterState('speaking');
                setIsRecruiterSpeaking(true);

                // PAUSE MIC to prevent echo
                if (speechRecognitionRef.current) {
                    console.log("[Mic] Pausing recognition (recruiter speaking)");
                    speechRecognitionRef.current.pause();
                }
            },
            onEnd: () => {
                setTTSIsSpeaking(false);
                setIsRecruiterSpeaking(false);
                if (status === 'interviewing') {
                    setRecruiterState('listening');
                }

                // RESUME MIC after delay
                setTimeout(() => {
                    if (status === 'interviewing' && speechRecognitionRef.current) {
                        console.log("[Mic] Resuming recognition");
                        speechRecognitionRef.current.resume();
                    }
                }, 500); // 500ms delay to clear echo tail
            },
            onError: (error) => {
                console.error('[TTS] Error:', error);
                setTTSIsSpeaking(false);
                setIsRecruiterSpeaking(false);
                if (speechRecognitionRef.current) {
                    speechRecognitionRef.current.resume();
                }
            }
        });

        setLastSpokenMessageId(lastMessage.id);
    }, [messages, ttsEnabled, voiceURI, ttsRate, ttsPitch, ttsVolume, config?.language, lastSpokenMessageId, setLastSpokenMessageId, setTTSIsSpeaking, setRecruiterState, status, setIsRecruiterSpeaking]);

    // Cancel TTS on interview end
    useEffect(() => {
        if (status === 'ended' || status === 'paused') {
            TTS.cancel();
            setTTSIsSpeaking(false);
        }
    }, [status, setTTSIsSpeaking]);

    // Handle user answer (from speech or text)
    const handleUserAnswer = useCallback(async (text: string) => {
        if (!text.trim()) return;

        // CRITICAL: Ignore input if recruiter is speaking (Double check against state)
        if (useInterviewStore.getState().isRecruiterSpeaking) {
            console.warn("[Interview] Ignored user input while recruiter is speaking (Echo prevention)");
            return;
        }

        // Debounce: prevent duplicate sends within 2 seconds
        const now = Date.now();
        const { lastSentTranscript, lastSentTimestamp, setLastSentTranscript } = useInterviewStore.getState();

        if (text.trim() === lastSentTranscript && (now - lastSentTimestamp) < 2000) {
            console.log('[Interview] Ignoring duplicate transcript');
            return;
        }

        // Mark as sent
        setLastSentTranscript(text.trim(), now);

        // Add user message
        addMessage({
            id: Date.now().toString(),
            type: "user",
            text: text.trim(),
            timestamp: Date.now(),
        });

        clearLiveInterim();
        setManualInput("");

        // Generate next question with candidate's answer
        await generateRecruiterQuestion(text.trim());
    }, [addMessage, clearLiveInterim, generateRecruiterQuestion]);

    // Initialize speech recognition
    useEffect(() => {
        if (status !== "interviewing") return;

        const recognition = createSpeechRecognition(useSpeechRecognition);
        speechRecognitionRef.current = recognition;

        if (!recognition.isSupported && useSpeechRecognition) {
            showToast("warning", "Speech recognition not supported. Using text input mode.");
            setUseSpeechRecognition(false);
            return;
        }

        if (useSpeechRecognition) {
            recognition.setLanguage(language);

            recognition.onInterim((text) => {
                // Don't show interim if recruiter is speaking
                if (!useInterviewStore.getState().isRecruiterSpeaking) {
                    setLiveInterim(text);
                }
            });

            recognition.onFinal((text) => {
                // Safety filter applied in handleUserAnswer too, but good to check here
                if (!useInterviewStore.getState().isRecruiterSpeaking) {
                    handleUserAnswer(text);
                }
            });

            recognition.onError((error) => {
                console.error("Speech recognition error:", error);
                // Only show toast for critical errors
                if (error.message !== 'no-speech' && error.message !== 'aborted') {
                    showToast("error", "Speech recognition error");
                }
            });

            recognition.start();
        }

        return () => {
            if (useSpeechRecognition && recognition) {
                recognition.stop();
            }
        };
    }, [status, useSpeechRecognition, language, setLiveInterim, handleUserAnswer, showToast]);

    const handleStart = async () => {
        if (!config) {
            showToast("error", "No interview configuration found");
            router.push("/onboarding");
            return;
        }

        // Generate unique session ID
        const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        useInterviewStore.getState().setSessionId(newSessionId);

        console.log(`[Interview] Starting new session: ${newSessionId}`);

        setStatus("interviewing");
        setRecruiterState("thinking");

        // Generate first question (initialization)
        await generateRecruiterQuestion();
    };

    const handleEnd = () => {
        setStatus("ended");
        setRecruiterState("idle");

        if (speechRecognitionRef.current) {
            speechRecognitionRef.current.stop();
        }

        showToast("info", "Interview ended");

        // Navigate to session review
        setTimeout(() => {
            router.push(`/session/mock-${Date.now()}`);
        }, 500);
    };

    const handleManualSubmit = () => {
        if (manualInput.trim()) {
            handleUserAnswer(manualInput);
        }
    };

    const toggleVideo = () => {
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    };

    const toggleAudio = () => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Top Bar */}
            <div className="glass-strong border-b border-gray-800 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold">Interview Room</h1>
                        {config && (
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-primary-500 text-gray-900 rounded-full text-sm font-semibold">
                                    {config.role}
                                </span>
                                <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">
                                    {config.level}
                                </span>
                                <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">
                                    {config.interviewType}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-2xl font-mono">{formatTime(elapsedTime)}</div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid lg:grid-cols-2 gap-6 p-6 h-[calc(100vh-80px)]">
                {/* Left: Video Panel */}
                <div className="flex flex-col gap-4">
                    <Card variant="glass" className="flex-1 flex flex-col">
                        <div className="relative flex-1 bg-gray-900 rounded-xl overflow-hidden">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                            {!isVideoEnabled && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                    <VideoOff className="w-16 h-16 text-gray-600" />
                                </div>
                            )}
                        </div>

                        {/* Audio Level Meter */}


                        {/* Controls */}
                        <div className="flex items-center justify-center gap-3 mt-4">
                            <Button
                                variant={isVideoEnabled ? "secondary" : "outline"}
                                size="sm"
                                onClick={toggleVideo}
                            >
                                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                            </Button>
                            <Button
                                variant={isAudioEnabled ? "secondary" : "outline"}
                                size="sm"
                                onClick={toggleAudio}
                            >
                                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                            </Button>

                        </div>
                    </Card>
                </div>

                {/* Right: Conversation Panel */}
                <div className="flex flex-col gap-4 h-full relative">
                    {/* Recruiter Avatar - Now takes more space */}
                    <Card variant="glass" className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-900 via-purple-950/20 to-gray-900 border-gray-800">
                        <RecruiterAvatar state={recruiterState} />
                    </Card>

                    {/* Manual Input (when not using speech recognition) */}

                </div>

                {/* Subtitles Overlay - Absolute positioned at the bottom */}
                <SubtitlesOverlay
                    messages={messages}
                    interimText={liveInterim}
                    currentlySpeakingId={ttsIsSpeaking ? lastSpokenMessageId : null}
                />

                {/* Transcript Modal */}
                <TranscriptModal
                    isOpen={isTranscriptModalOpen}
                    onClose={() => setIsTranscriptModalOpen(false)}
                    messages={messages}
                />

                {/* Action Buttons */}
                <div className="col-span-1 lg:col-span-2 flex flex-wrap items-center justify-center gap-3">
                    {status === "idle" && (
                        <Button size="lg" onClick={handleStart}>
                            <Play className="w-5 h-5" />
                            Start Interview
                        </Button>
                    )}

                    {status === "interviewing" && (
                        <Button variant="outline" onClick={handleEnd} className="border-red-500 text-red-500">
                            <Phone className="w-5 h-5" />
                            End Interview
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
