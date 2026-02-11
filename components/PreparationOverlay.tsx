"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Loader2, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { useInterviewStore } from "@/store/interview";
import { persistence } from "@/lib/persistence";

// Demo mode mock first responses by language
const DEMO_RESPONSES: Record<string, string[]> = {
    EN: [
        "Hello! Welcome to this interview. I'm excited to learn more about you and your experience. Let's start with an introduction — could you tell me a bit about yourself, your background, and what made you interested in this role?",
        "Good day! Thank you for joining us today. I'd like to start by getting to know you better. Could you walk me through your professional journey and what brings you here today?",
        "Hi there! I'm glad you could make it. Before we dive into the technical questions, I'd love to hear about your experience and what motivates you in your career.",
    ],
    FR: [
        "Bonjour ! Bienvenue à cet entretien. Je suis ravi de pouvoir échanger avec vous. Commençons par une présentation — pourriez-vous me parler de votre parcours et de ce qui vous a motivé à postuler pour ce poste ?",
        "Bonjour et merci d'être là aujourd'hui ! J'aimerais d'abord mieux vous connaître. Pouvez-vous me présenter votre parcours professionnel et ce qui vous amène ici ?",
        "Bienvenue ! Je suis content de vous rencontrer. Avant d'aborder les questions techniques, j'aimerais entendre parler de votre expérience et de vos motivations professionnelles.",
    ],
};

type PrepState = "preparing" | "ready" | "error";

interface PreparationOverlayProps {
    onReady: () => void;
}

export default function PreparationOverlay({ onReady }: PreparationOverlayProps) {
    const [prepState, setPrepState] = useState<PrepState>("preparing");
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("Initializing session...");
    const [errorText, setErrorText] = useState("");
    const hasStarted = useRef(false);

    const { config, sessionId, setPreloadedResponse, setDemoMode, setHasInitialized } =
        useInterviewStore();

    const preloadFirstResponse = useCallback(async () => {
        if (hasStarted.current) return;
        hasStarted.current = true;

        if (!config) {
            setPrepState("error");
            setErrorText("No interview configuration found.");
            return;
        }

        // Step 1: Creating session
        setStatusText("Creating session...");
        setProgress(15);

        let dbSessionId = sessionId;
        try {
            dbSessionId = await persistence.createSession(config);
            useInterviewStore.getState().setSessionId(dbSessionId);
        } catch (err) {
            console.warn("[Prep] DB session creation failed, using fallback ID");
            const fallbackId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            useInterviewStore.getState().setSessionId(fallbackId);
            dbSessionId = fallbackId;
        }

        setProgress(35);
        setStatusText("Preparing AI recruiter...");

        // Step 2: Pre-fire the first API call
        try {
            setProgress(50);
            setStatusText("Generating first question...");

            const currentSessionId = useInterviewStore.getState().sessionId;

            const response = await fetch('/api/interview/next-turn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    interviewParams: config,
                    isInit: true,
                    messages: [],
                }),
            });

            const responseData = await response.json();

            if (responseData.ok && responseData.data?.say) {
                // API responded successfully!
                setProgress(90);
                setStatusText("AI recruiter is ready!");
                setPreloadedResponse({
                    say: responseData.data.say,
                    evaluation: responseData.data.evaluation,
                });
                setDemoMode(false);

                await new Promise(r => setTimeout(r, 600));
                setProgress(100);
                setPrepState("ready");
            } else {
                // API returned an error — switch to demo mode
                console.warn("[Prep] API returned error, switching to demo mode:", responseData.error);
                activateDemoMode();
            }
        } catch (err) {
            // Network error or API unreachable — switch to demo mode
            console.warn("[Prep] API call failed, switching to demo mode:", err);
            activateDemoMode();
        }
    }, [config, sessionId, setPreloadedResponse, setDemoMode, setHasInitialized]);

    const activateDemoMode = useCallback(() => {
        setProgress(70);
        setStatusText("API unavailable — switching to demo mode...");

        const lang = config?.language || "EN";
        const responses = DEMO_RESPONSES[lang] || DEMO_RESPONSES["EN"];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];

        setPreloadedResponse({ say: randomResponse });
        setDemoMode(true);

        setTimeout(() => {
            setProgress(100);
            setStatusText("Demo mode ready!");
            setPrepState("ready");
        }, 1200);
    }, [config, setPreloadedResponse, setDemoMode]);

    useEffect(() => {
        preloadFirstResponse();
    }, [preloadFirstResponse]);

    // Auto-proceed to interview 1.5s after "ready"
    useEffect(() => {
        if (prepState === "ready") {
            const timer = setTimeout(onReady, 1500);
            return () => clearTimeout(timer);
        }
    }, [prepState, onReady]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0a0a12]">
            {/* Ambient background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(0,255,136,0.06) 0%, transparent 70%)',
                    }}
                />
                <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)',
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 flex flex-col items-center gap-8 max-w-md text-center px-6"
            >
                {/* Icon */}
                <div className="relative">
                    <motion.div
                        className="w-24 h-24 rounded-full flex items-center justify-center"
                        style={{
                            background: prepState === "ready"
                                ? 'rgba(0, 255, 136, 0.1)'
                                : prepState === "error"
                                    ? 'rgba(239, 68, 68, 0.1)'
                                    : 'rgba(139, 92, 246, 0.1)',
                            border: `2px solid ${prepState === "ready"
                                ? 'rgba(0, 255, 136, 0.3)'
                                : prepState === "error"
                                    ? 'rgba(239, 68, 68, 0.3)'
                                    : 'rgba(139, 92, 246, 0.3)'}`,
                        }}
                        animate={prepState === "preparing" ? {
                            boxShadow: [
                                '0 0 20px rgba(139,92,246,0.1)',
                                '0 0 40px rgba(139,92,246,0.2)',
                                '0 0 20px rgba(139,92,246,0.1)',
                            ],
                        } : prepState === "ready" ? {
                            boxShadow: '0 0 30px rgba(0,255,136,0.2)',
                        } : {}}
                        transition={{ duration: 2, repeat: prepState === "preparing" ? Infinity : 0, ease: "easeInOut" }}
                    >
                        <AnimatePresence mode="wait">
                            {prepState === "preparing" && (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                                </motion.div>
                            )}
                            {prepState === "ready" && (
                                <motion.div key="ready" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
                                    <CheckCircle2 className="w-10 h-10 text-primary-400" />
                                </motion.div>
                            )}
                            {prepState === "error" && (
                                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <AlertTriangle className="w-10 h-10 text-red-400" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Pulsing ring */}
                    {prepState === "preparing" && (
                        <motion.div
                            className="absolute inset-[-8px] rounded-full border border-purple-500/20"
                            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                    )}
                </div>

                {/* Title */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {prepState === "ready" ? "Ready to Begin!" : prepState === "error" ? "Something went wrong" : "Preparing Your Interview"}
                    </h2>
                    <p className="text-sm text-gray-400">
                        {statusText}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-xs">
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            style={{
                                background: prepState === "error"
                                    ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                    : 'linear-gradient(90deg, #8b5cf6, #00ff88)',
                            }}
                            initial={{ width: "0%" }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                </div>

                {/* Config badges */}
                {config && (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold"
                            style={{
                                background: 'rgba(0, 255, 136, 0.12)',
                                color: '#00ff88',
                                border: '1px solid rgba(0, 255, 136, 0.25)',
                            }}
                        >
                            {config.role}
                        </span>
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400">
                            {config.level}
                        </span>
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400">
                            {config.interviewType}
                        </span>
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400">
                            {config.language}
                        </span>
                    </div>
                )}

                {/* Demo mode notice */}
                {prepState === "ready" && useInterviewStore.getState().demoMode && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg"
                        style={{
                            background: 'rgba(245, 158, 11, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                        }}
                    >
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs text-amber-300">Demo mode — AI responses are pre-generated</span>
                    </motion.div>
                )}

                {/* Error retry button */}
                {prepState === "error" && (
                    <button
                        onClick={() => {
                            hasStarted.current = false;
                            setPrepState("preparing");
                            setProgress(0);
                            preloadFirstResponse();
                        }}
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                        style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                    >
                        Retry
                    </button>
                )}

                {/* Skip / Enter now */}
                {prepState === "ready" && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        onClick={onReady}
                        className="px-8 py-3 rounded-2xl text-base font-bold tracking-wide transition-all duration-300"
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
                        Enter Interview
                    </motion.button>
                )}
            </motion.div>
        </div>
    );
}
