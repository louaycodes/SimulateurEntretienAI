"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConversationMessage } from "@/lib/types";

interface SubtitlesOverlayProps {
    messages: ConversationMessage[];
    interimText: string;
    currentlySpeakingId: string | null;
    recruiterText?: string;
    recruiterSpeaking?: boolean;
}

interface SubtitleChunk {
    id: string;
    text: string;
    speaker: "recruiter" | "user";
    duration: number;
}

export default function SubtitlesOverlay({
    messages,
    interimText,
    currentlySpeakingId,
    recruiterText = "",
    recruiterSpeaking = false
}: SubtitlesOverlayProps) {
    const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleChunk | null>(null);
    const [queue, setQueue] = useState<SubtitleChunk[]>([]);
    const processingRef = useRef<boolean>(false);
    const lastProcessedMessageIdRef = useRef<string | null>(null);

    // Process new messages into subtitle chunks
    useEffect(() => {
        if (messages.length === 0) return;

        const lastData = messages[messages.length - 1];

        // Only process new messages
        if (lastData.id === lastProcessedMessageIdRef.current) return;
        lastProcessedMessageIdRef.current = lastData.id;

        const chunks: SubtitleChunk[] = [];
        const words = lastData.text.split(" ");
        let currentChunk = "";

        // Chunking logic: ~10 words per line or sentence breaks
        words.forEach((word) => {
            const temp = currentChunk ? `${currentChunk} ${word}` : word;
            if (temp.length > 60 || word.endsWith(".") || word.endsWith("?") || word.endsWith("!")) {
                chunks.push({
                    id: `${lastData.id}-${chunks.length}`,
                    text: temp,
                    speaker: lastData.type as "recruiter" | "user",
                    duration: Math.max(1500, temp.length * 60) // Dynamic duration logic
                });
                currentChunk = "";
            } else {
                currentChunk = temp;
            }
        });

        if (currentChunk) {
            chunks.push({
                id: `${lastData.id}-${chunks.length}`,
                text: currentChunk,
                speaker: lastData.type as "recruiter" | "user",
                duration: Math.max(1500, currentChunk.length * 60)
            });
        }

        setQueue((prev) => [...prev, ...chunks]);
    }, [messages]);

    // Subtitle Queue Consumer Loop
    useEffect(() => {
        if (processingRef.current) return;
        if (queue.length === 0 && !currentSubtitle) return;

        const processQueue = async () => {
            processingRef.current = true;

            const nextChunk = queue[0];
            if (nextChunk) {
                // Remove from queue immediately
                setQueue((prev) => prev.slice(1));

                // Show subtitle
                setCurrentSubtitle(nextChunk);

                // Wait for duration
                await new Promise((resolve) => setTimeout(resolve, nextChunk.duration));

                // Clear subtitle (fade out handled by AnimatePresence)
                setCurrentSubtitle(null);

                // Small gap between subtitles
                await new Promise((resolve) => setTimeout(resolve, 200));
            }

            processingRef.current = false;
        };

        if (!processingRef.current && queue.length > 0) {
            processQueue();
        }
    }, [queue, currentSubtitle]);

    // Priority: 1) Recruiter speaking (live), 2) User interim, 3) Queue
    const displaySubtitle = recruiterSpeaking && recruiterText
        ? { text: recruiterText, speaker: "recruiter" as const, id: "recruiter-live", duration: 0 }
        : interimText
            ? { text: interimText, speaker: "user" as const, id: "interim", duration: 0 }
            : currentSubtitle;

    return (
        <div className="absolute bottom-14 left-0 right-0 flex justify-center px-8 text-center pointer-events-none z-50">
            <AnimatePresence mode="wait">
                {displaySubtitle && (
                    <motion.div
                        key={displaySubtitle.id === "interim" ? "interim" : displaySubtitle.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="max-w-3xl rounded-2xl px-6 py-3.5 flex items-center gap-3"
                        style={{
                            background: 'rgba(10, 10, 18, 0.75)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                        }}
                    >
                        {/* Speaker chip */}
                        <span
                            className="shrink-0 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                            style={{
                                background: displaySubtitle.speaker === "recruiter"
                                    ? 'rgba(0, 255, 136, 0.12)'
                                    : 'rgba(59, 130, 246, 0.12)',
                                color: displaySubtitle.speaker === "recruiter"
                                    ? '#00ff88'
                                    : '#60a5fa',
                                border: `1px solid ${displaySubtitle.speaker === "recruiter"
                                    ? 'rgba(0, 255, 136, 0.25)'
                                    : 'rgba(59, 130, 246, 0.25)'}`,
                            }}
                        >
                            {displaySubtitle.speaker === "recruiter" ? "AI" : "You"}
                        </span>

                        {/* Subtitle text */}
                        <p className={`text-lg md:text-xl font-medium leading-relaxed tracking-wide
                            ${displaySubtitle.speaker === "recruiter" ? "text-gray-100" : "text-blue-100"}
                            ${displaySubtitle.id === "interim" ? "italic opacity-80" : ""}
                        `}
                            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                        >
                            {displaySubtitle.text}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

