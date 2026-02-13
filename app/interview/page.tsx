"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

import { buildInterviewSystemPrompt } from "@/lib/prompts";
import FilmTranscript from "@/components/FilmTranscript"; // Keep for now or remove if fully replaced
import SubtitlesOverlay from "@/components/SubtitlesOverlay";
import TranscriptModal from "@/components/TranscriptModal";
import PreparationOverlay from "@/components/PreparationOverlay";
import { useTTSStore } from "@/store/ttsStore";
import * as TTS from "@/lib/tts";
import { TTSQueue } from "@/lib/ttsQueue";
import { persistence } from "@/lib/persistence";

export default function InterviewPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const cleanupAudioLevelRef = useRef<(() => void) | null>(null);
    const speechRecognitionRef = useRef<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // TTS Queue Ref
    const ttsQueueRef = useRef<TTSQueue | null>(null);

    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [useSpeechRecognition, setUseSpeechRecognition] = useState(true);
    const [manualInput, setManualInput] = useState("");
    const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
    const [errorDetails, setErrorDetails] = useState<{ code: string; message: string; hint: string; requestId: string } | null>(null);
    const [waitingForSilence, setWaitingForSilence] = useState(false);
    const [showPreparation, setShowPreparation] = useState(true);

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
        utteranceBuffer,
        silenceTimerId,
        requestInFlight,
        blockedUntil,
        lastSentNormalized,
        requestCounter,
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
        appendUtteranceBuffer,
        clearUtteranceBuffer,
        setSilenceTimerId,
        setRequestInFlight,
        setBlockedUntil,
        setLastSentNormalized,
        incrementRequestCounter,
        reset,
        preloadedResponse,
        demoMode,
        setPreloadedResponse,
        setDemoMode,
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



    // Generate next recruiter question or initialize interview
    const generateRecruiterQuestion = useCallback(async (candidateText?: string) => {
        if (!config || !sessionId) return;

        const now = Date.now();
        const isInitialization = !hasInitialized;

        // GUARD 1: Single-flight lock (HARD GATE)
        if (requestInFlight) {
            console.warn('[LLM] Ignored: request already in flight');
            return;
        }

        // GUARD 2: Error cooldown
        if (now < blockedUntil) {
            const remainingMs = blockedUntil - now;
            console.warn(`[LLM] Ignored: blocked for ${Math.ceil(remainingMs / 1000)}s more`);
            return;
        }

        // GUARD 3: Don't send while recruiter is speaking
        if (isRecruiterSpeaking) {
            console.warn('[LLM] Ignored: recruiter is speaking');
            return;
        }

        // GUARD 4: Minimum length check (skip for init)
        if (!isInitialization && candidateText) {
            const wordCount = candidateText.trim().split(/\s+/).length;
            const charCount = candidateText.trim().length;

            if (wordCount < 3 || charCount < 12) {
                console.warn(`[LLM] Ignored: too short (${wordCount} words, ${charCount} chars)`);
                return;
            }
        }

        // GUARD 5: Deduplication
        if (!isInitialization && candidateText) {
            const normalized = candidateText.toLowerCase().trim()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, ' ');

            if (normalized === lastSentNormalized && (now - (useInterviewStore.getState().lastSentTimestamp || 0)) < 10000) {
                console.warn('[LLM] Ignored: duplicate transcript');
                return;
            }

            setLastSentNormalized(normalized);
        }

        // Set lock
        setRequestInFlight(true);
        incrementRequestCounter();
        setErrorDetails(null);

        const currentRequestNum = requestCounter + 1;
        const wordCount = candidateText ? candidateText.trim().split(/\s+/).length : 0;
        const charCount = candidateText ? candidateText.trim().length : 0;

        console.log(`[LLM] Sending next-turn #${currentRequestNum} - ${wordCount} words, ${charCount} chars`);

        // Cancel any pending TTS
        ttsQueueRef.current?.cancel();

        setRecruiterState("thinking");
        clearStreamingText();

        try {
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

            // Call API
            const response = await fetch('/api/interview/next-turn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            // Parse response (always JSON now)
            const responseData = await response.json();

            // Check for ok:false responses
            if (!responseData.ok) {
                const error = responseData.error || {};
                console.error(`[LLM] #${currentRequestNum} failed:`, error.code, error.message);

                setErrorDetails({
                    code: error.code || 'UNKNOWN',
                    message: error.message || 'Request failed',
                    hint: error.hint || 'Check server logs',
                    requestId: error.requestId || 'N/A'
                });

                // Handle 429 rate limit with longer cooldown
                if (error.code === 'QUOTA_EXCEEDED' || error.code === 'RATE_LIMITED' || response.status === 429) {
                    const cooldownMs = 30000; // 30 seconds for rate limit
                    setBlockedUntil(Date.now() + cooldownMs);
                    console.warn(`[LLM] Rate limited - blocked for ${cooldownMs / 1000}s`);
                } else {
                    // Other errors: 2 second cooldown
                    setBlockedUntil(Date.now() + 2000);
                }

                throw new Error(error.message || 'API Request failed');
            }

            // For synchronous response (current fallback mode)
            const data = responseData.data;

            // Handle synchronous response (streaming disabled due to API key issue)
            setRecruiterState("speaking");

            // Synchronous mode: speak the full text at once
            if (data.say) {
                if (ttsEnabled && ttsQueueRef.current) {
                    ttsQueueRef.current.enqueue(data.say);
                    ttsQueueRef.current.flush();
                }
            }

            // Process response data
            try {

                // Mark as initialized
                if (isInitialization) {
                    setHasInitialized(true);
                    console.log(`[LLM] #${currentRequestNum} - Session initialized`);
                }

                // Store private notes with evaluation
                if (data.evaluation) {
                    addPrivateNote({
                        timestamp: Date.now(),
                        signals: data.evaluation.signals || [],
                        score_hint: {
                            total: data.evaluation.total_score || 0,
                            technical: data.evaluation.technical_score || 0,
                            communication: data.evaluation.communication_score || 0,
                            problem_solving: data.evaluation.problem_solving_score || 0,
                        },
                    });
                }

                // Add recruiter message
                if (data.say) {
                    addMessage({
                        id: Date.now().toString(),
                        type: "recruiter",
                        text: data.say,
                        timestamp: Date.now(),
                    });

                    setLastSpokenMessageId(messages.length.toString());

                    // Persist recruiter message
                    persistence.queueMessage({
                        role: "recruiter",
                        text: data.say,
                        timestampMs: Date.now(),
                        elapsedSec: elapsedTime,
                    });
                }

                console.log(`[LLM] #${currentRequestNum} - Success`);
            } catch (e) {
                console.error(`[LLM] #${currentRequestNum} - Error processing response:`, e);
            }

            // State cleanup is handled by TTS onEnd, but just in case
            if (!ttsIsSpeaking) {
                setRecruiterState("listening"); // Fallback
            }

        } catch (error) {
            console.error(`[LLM] #${currentRequestNum} - Request failed:`, error);

            // Only show toast if we don't have detailed error already
            if (!errorDetails) {
                showToast("error", error instanceof Error ? error.message : "Failed to generate question");
            }

            setRecruiterState("idle");
        } finally {
            // Always release lock
            setRequestInFlight(false);
        }
    }, [config, sessionId, hasInitialized, messages, requestInFlight, blockedUntil, isRecruiterSpeaking, lastSentNormalized, requestCounter, setRecruiterState, addMessage, addPrivateNote, showToast, clearStreamingText, setHasInitialized, ttsEnabled, ttsIsSpeaking, setLastSpokenMessageId, setRequestInFlight, setBlockedUntil, setLastSentNormalized, incrementRequestCounter, errorDetails]);

    // Auto-generate first question when interview starts WITHOUT a preloaded response
    useEffect(() => {
        if (status === "interviewing" && messages.length === 0 && config && !hasInitialized && !requestInFlight && !preloadedResponse) {
            // Recruiter speaks first!
            console.log('[Interview] Auto-starting initialization (no preloaded response)');

            // Create DB session and then start
            persistence.createSession(config)
                .then((dbSessionId) => {
                    useInterviewStore.getState().setSessionId(dbSessionId);
                    console.log('[Interview] DB Session created:', dbSessionId);
                    generateRecruiterQuestion();
                })
                .catch(err => {
                    console.error('[Interview] Failed to create DB session:', err);
                    generateRecruiterQuestion(); // Fallback
                });
        }
    }, [status, messages.length, config, hasInitialized, requestInFlight, preloadedResponse, generateRecruiterQuestion]);

    // Initialize TTS Queue
    useEffect(() => {
        ttsQueueRef.current = new TTSQueue({
            onStart: () => {
                setTTSIsSpeaking(true);
                setIsRecruiterSpeaking(true);
                setRecruiterState('speaking');

                // Pause mic
                if (speechRecognitionRef.current) {
                    console.log("[Mic] Pausing recognition (recruiter speaking)");
                    speechRecognitionRef.current.pause();
                }
            },
            onSpeakingStateChange: (speaking) => {
                if (speaking) {
                    setRecruiterState('speaking');
                    setIsRecruiterSpeaking(true);
                }
            },
            onEnd: () => {
                setTTSIsSpeaking(false);
                setIsRecruiterSpeaking(false);

                if (useInterviewStore.getState().status === 'interviewing') {
                    setRecruiterState('listening');
                }

                // Resume mic with delay
                setTimeout(() => {
                    const currentStatus = useInterviewStore.getState().status;
                    if (currentStatus === 'interviewing' && speechRecognitionRef.current) {
                        console.log("[Mic] Resuming recognition");
                        speechRecognitionRef.current.resume();
                    }
                }, 500);
            }
        });

        return () => {
            console.log("[TTS Queue] Cleaning up");
            ttsQueueRef.current?.cancel();
        };
    }, [setIsRecruiterSpeaking, setRecruiterState, setTTSIsSpeaking]);

    // Update TTS Options when they change
    useEffect(() => {
        if (ttsQueueRef.current) {
            ttsQueueRef.current.setOptions({
                voiceURI: voiceURI || undefined,
                rate: ttsRate,
                pitch: ttsPitch,
                volume: ttsVolume,
                lang: config?.language === 'FR' ? 'fr-FR' : 'en-US',
            });
        }
    }, [voiceURI, ttsRate, ttsPitch, ttsVolume, config?.language]);

    // Cancel TTS on interview end
    useEffect(() => {
        if (status === 'ended' || status === 'paused') {
            ttsQueueRef.current?.cancel();
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
    }, []); // Dependencies removed as this function is now just a guard

    // Utterance aggregator: accumulate final transcripts and send after silence
    const handleFinalTranscript = useCallback((text: string) => {
        if (!text || text.trim().length === 0) return;

        // Ignore if recruiter is speaking
        if (isRecruiterSpeaking) {
            console.warn('[Utterance] Ignored: recruiter is speaking');
            return;
        }

        // Append to buffer
        appendUtteranceBuffer(text);
        setWaitingForSilence(true);

        // Clear any existing silence timer
        if (silenceTimerId) {
            clearTimeout(silenceTimerId);
        }

        // Start new silence timer (1000ms)
        const timerId = setTimeout(() => {
            const currentBuffer = useInterviewStore.getState().utteranceBuffer;

            if (currentBuffer && currentBuffer.trim().length > 0) {
                console.log(`[Utterance] Silence detected - sending buffer: "${currentBuffer.substring(0, 50)}..."`);

                // Send the accumulated utterance
                sendCompleteUtterance(currentBuffer.trim());

                // Clear buffer
                clearUtteranceBuffer();
                setWaitingForSilence(false);
            }

            setSilenceTimerId(null);
        }, 1000); // 1 second silence threshold

        setSilenceTimerId(timerId);
    }, [isRecruiterSpeaking, silenceTimerId, appendUtteranceBuffer, clearUtteranceBuffer, setSilenceTimerId]);

    // Send complete utterance to LLM
    const sendCompleteUtterance = useCallback(async (text: string) => {
        // Add to message history
        addMessage({
            id: Date.now().toString(),
            type: "user",
            text,
            timestamp: Date.now(),
        });

        // Persist user message
        persistence.queueMessage({
            role: "candidate",
            text,
            timestampMs: Date.now(),
            elapsedSec: elapsedTime,
        });

        clearLiveInterim();

        // Generate next question with candidate's answer
        await generateRecruiterQuestion(text);
    }, [addMessage, clearLiveInterim, generateRecruiterQuestion]);

    // Manual send button handler
    const handleManualSend = useCallback(() => {
        const currentBuffer = utteranceBuffer.trim();

        if (!currentBuffer || currentBuffer.length === 0) {
            showToast("warning", "Please speak or type your answer first");
            return;
        }

        // Clear silence timer if active
        if (silenceTimerId) {
            clearTimeout(silenceTimerId);
            setSilenceTimerId(null);
        }

        console.log(`[Utterance] Manual send - buffer: "${currentBuffer.substring(0, 50)}..."`);

        // Send immediately
        sendCompleteUtterance(currentBuffer);
        clearUtteranceBuffer();
        setWaitingForSilence(false);
    }, [utteranceBuffer, silenceTimerId, sendCompleteUtterance, clearUtteranceBuffer, setSilenceTimerId, showToast]);

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
                // INTERIM: Update UI only, NEVER trigger API
                if (!useInterviewStore.getState().isRecruiterSpeaking) {
                    setLiveInterim(text);
                }
            });

            recognition.onFinal((text) => {
                // FINAL: Append to buffer and start/reset silence timer
                if (!useInterviewStore.getState().isRecruiterSpeaking) {
                    handleFinalTranscript(text);
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
    }, [status, useSpeechRecognition, language, setLiveInterim, handleFinalTranscript, showToast]);

    const handleStart = async () => {
        if (!config) {
            showToast("error", "No interview configuration found");
            router.push("/onboarding");
            return;
        }

        // Ensure we have a session ID (was created by PreparationOverlay)
        const currentSessionId = useInterviewStore.getState().sessionId;
        if (!currentSessionId) {
            const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            useInterviewStore.getState().setSessionId(newSessionId);
        }

        console.log(`[Interview] Starting session: ${useInterviewStore.getState().sessionId}`);
        setStatus("interviewing");

        // Use preloaded response if available (from PreparationOverlay)
        const preloaded = useInterviewStore.getState().preloadedResponse;
        if (preloaded && preloaded.say) {
            console.log('[Interview] Using preloaded response — instant start!');
            setRecruiterState("speaking");
            setHasInitialized(true);

            // Add recruiter message
            addMessage({
                id: Date.now().toString(),
                type: "recruiter",
                text: preloaded.say,
                timestamp: Date.now(),
            });

            // TTS
            if (ttsEnabled && ttsQueueRef.current) {
                ttsQueueRef.current.enqueue(preloaded.say);
                ttsQueueRef.current.flush();
            }

            // Store evaluation if present
            if (preloaded.evaluation) {
                addPrivateNote({
                    timestamp: Date.now(),
                    signals: preloaded.evaluation.signals || [],
                    score_hint: {
                        total: preloaded.evaluation.total_score || 0,
                        technical: preloaded.evaluation.technical_score || 0,
                        communication: preloaded.evaluation.communication_score || 0,
                        problem_solving: preloaded.evaluation.problem_solving_score || 0,
                    },
                });
            }

            // Persist
            persistence.queueMessage({
                role: "recruiter",
                text: preloaded.say,
                timestampMs: Date.now(),
                elapsedSec: 0,
            });

            // Clear preloaded
            setPreloadedResponse(null);

            // After TTS finishes, transition to listening (if not already handled)
            if (!ttsEnabled) {
                setTimeout(() => setRecruiterState("listening"), 2000);
            }
        } else {
            // Fallback: fire the API call now (old behavior)
            setRecruiterState("thinking");
            await generateRecruiterQuestion();
        }
    };

    const handleEnd = async () => {
        // Stop media
        if (streamRef.current) {
            stopMediaStream(streamRef.current);
        }
        if (speechRecognitionRef.current) {
            speechRecognitionRef.current.stop();
        }
        if (ttsQueueRef.current) {
            ttsQueueRef.current.cancel();
        }

        setStatus("ended");
        showToast("success", "Interview ended. Generating report...");

        try {
            // End session in DB and get report
            await persistence.endSession(messages, config);

            // Redirect to REAL session page
            if (sessionId) {
                router.push(`/session/${sessionId}`);
            } else {
                console.error("No sessionId found for redirect");
                router.push('/dashboard');
            }
        } catch (error) {
            console.error("Failed to persist end session:", error);
            showToast("error", "Failed to save session, but you can view the transcript.");
            // Fallback
            if (sessionId) {
                router.push(`/session/${sessionId}`);
            } else {
                router.push('/dashboard');
            }
        }
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
        <>
            {/* Preparation Overlay */}
            <AnimatePresence>
                {showPreparation && (
                    <motion.div
                        key="prep"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <PreparationOverlay
                            onReady={() => {
                                setShowPreparation(false);
                                // Auto-start the interview
                                handleStart();
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="min-h-screen bg-[#0a0a12] text-white flex flex-col overflow-hidden">
                {/* ── Top Bar ── */}
                <div className="relative px-6 py-3 flex items-center justify-between"
                    style={{
                        background: 'linear-gradient(180deg, rgba(15,15,25,0.95) 0%, rgba(10,10,18,0.85) 100%)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    {/* Left: Title + Badges */}
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-bold tracking-tight">Interview Room</h1>
                        {config && (
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
                                    style={{
                                        background: 'rgba(0, 255, 136, 0.12)',
                                        color: '#00ff88',
                                        border: '1px solid rgba(0, 255, 136, 0.25)',
                                    }}
                                >
                                    {config.role}
                                </span>
                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">
                                    {config.level}
                                </span>
                                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">
                                    {config.interviewType}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right: Timer */}
                    <div className="flex items-center gap-2 text-gray-300">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xl font-mono tracking-wider" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatTime(elapsedTime)}
                        </span>
                    </div>

                    {/* Bottom gradient line */}
                    <div className="absolute bottom-0 left-0 right-0 h-[1px]"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,136,0.3) 50%, transparent 100%)' }}
                    />
                </div>

                {/* ── Main Content ── */}
                <div className="flex-1 grid lg:grid-cols-2 gap-5 p-5 min-h-0">
                    {/* Left Column: Video Panel */}
                    <div className="flex flex-col gap-4 min-h-0">
                        <div className={clsx("video-panel flex-1 flex flex-col", !isVideoEnabled && "camera-off")}>
                            {/* Video Feed */}
                            <div className="relative flex-1">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                                {!isVideoEnabled && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                        <div className="w-20 h-20 rounded-full flex items-center justify-center"
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '2px solid rgba(255,255,255,0.1)',
                                            }}
                                        >
                                            <VideoOff className="w-10 h-10 text-gray-500" />
                                        </div>
                                        <span className="text-sm text-gray-500 font-medium">Camera Off</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Control Dock ── */}
                        <div className="flex justify-center">
                            <div className="control-dock">
                                <button
                                    className={clsx("control-btn", isVideoEnabled && "active")}
                                    onClick={toggleVideo}
                                    title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
                                >
                                    {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                                </button>
                                <button
                                    className={clsx("control-btn", isAudioEnabled && "active")}
                                    onClick={toggleAudio}
                                    title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
                                >
                                    {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                                </button>

                                {/* Divider */}
                                <div className="w-[1px] h-8 bg-white/10 mx-1" />

                                {status === "interviewing" && (
                                    <button
                                        className="control-btn danger"
                                        onClick={handleEnd}
                                        title="End interview"
                                    >
                                        <Phone className="w-5 h-5 rotate-[135deg]" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Recruiter Panel */}
                    <div className="flex flex-col gap-4 min-h-0 relative">
                        <div className="recruiter-bg flex-1 rounded-2xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                            {/* Subtle grid overlay */}
                            <div className="absolute inset-0 pointer-events-none"
                                style={{
                                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
                                    backgroundSize: '24px 24px',
                                }}
                            />
                            <RecruiterAvatar state={recruiterState} />
                        </div>

                        {/* Utterance Buffer Indicator */}
                        {waitingForSilence && utteranceBuffer && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10"
                            >
                                <div className="flex items-center gap-3 px-5 py-2.5 rounded-full"
                                    style={{
                                        background: 'rgba(59, 130, 246, 0.15)',
                                        backdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                        <span className="text-sm text-blue-200">Listening...</span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={handleManualSend}
                                        disabled={requestInFlight}
                                        className="ml-1 !py-1 !px-3 !text-xs !rounded-full"
                                    >
                                        Send Now
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Subtitles Overlay */}
                    <SubtitlesOverlay
                        messages={messages}
                        interimText={liveInterim}
                        currentlySpeakingId={ttsIsSpeaking ? lastSpokenMessageId : null}
                        recruiterText={streamingText}
                        recruiterSpeaking={recruiterState === "speaking"}
                    />

                    {/* Transcript Modal */}
                    <TranscriptModal
                        isOpen={isTranscriptModalOpen}
                        onClose={() => setIsTranscriptModalOpen(false)}
                        messages={messages}
                    />

                    {/* ── Start Button (only when idle and no prep overlay) ── */}
                    {status === "idle" && !showPreparation && (
                        <div className="col-span-1 lg:col-span-2 flex items-center justify-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                <button
                                    onClick={handleStart}
                                    className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-bold tracking-wide transition-all duration-300"
                                    style={{
                                        background: 'linear-gradient(135deg, #00ff88 0%, #39FF14 100%)',
                                        color: '#0a0a12',
                                        boxShadow: '0 0 30px rgba(0, 255, 136, 0.3), 0 4px 20px rgba(0, 0, 0, 0.3)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = '0 0 50px rgba(0, 255, 136, 0.5), 0 4px 30px rgba(0, 0, 0, 0.4)';
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 136, 0.3), 0 4px 20px rgba(0, 0, 0, 0.3)';
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    <Play className="w-6 h-6" />
                                    Start Interview
                                </button>
                            </motion.div>
                        </div>
                    )}
                </div>

                {/* ── Error Banner ── */}
                {errorDetails && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mx-5 mb-4 rounded-xl overflow-hidden"
                        style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                        }}
                    >
                        <div className="flex items-start justify-between gap-4 p-4">
                            <div className="flex-1">
                                <h3 className="font-semibold text-red-400 mb-1 text-sm">Error: {errorDetails.code}</h3>
                                <p className="text-sm text-gray-300 mb-1">{errorDetails.message}</p>
                                {errorDetails.hint && (
                                    <p className="text-xs text-gray-500 italic">Hint: {errorDetails.hint}</p>
                                )}
                                {blockedUntil > Date.now() && (
                                    <p className="text-xs text-yellow-400 mt-2">
                                        Cooldown: {Math.ceil((blockedUntil - Date.now()) / 1000)}s remaining
                                    </p>
                                )}
                                <p className="text-xs text-gray-600 mt-1">Request ID: {errorDetails.requestId}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setErrorDetails(null);
                                        setBlockedUntil(0);
                                        if (!hasInitialized) {
                                            generateRecruiterQuestion();
                                        }
                                    }}
                                    className="!rounded-lg !text-xs"
                                >
                                    Retry
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setErrorDetails(null)}
                                    className="!rounded-lg !text-xs"
                                >
                                    Dismiss
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </>
    );
}

