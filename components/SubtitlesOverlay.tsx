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
        <div className="absolute bottom-12 left-0 right-0 flex justify-center px-8 text-center pointer-events-none z-50">
            <AnimatePresence mode="wait">
                {displaySubtitle && (
                    <motion.div
                        key={displaySubtitle.id === "interim" ? "interim" : displaySubtitle.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="bg-black/60 backdrop-blur-sm px-6 py-3 rounded-lg border border-white/10 shadow-xl max-w-3xl"
                    >
                        <p className={`text-xl md:text-2xl font-medium leading-relaxed tracking-wide drop-shadow-md
                            ${displaySubtitle.speaker === "recruiter" ? "text-yellow-200" : "text-white"}
                            ${displaySubtitle.id === "interim" ? "italic opacity-90" : ""}
                        `}>
                            {displaySubtitle.text}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
