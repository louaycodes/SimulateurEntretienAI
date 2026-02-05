"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
    id: string;
    type: "recruiter" | "user";
    text: string;
    timestamp: number;
}

interface FilmTranscriptProps {
    messages: Message[];
    interimText?: string;
    currentlySpeakingId?: string | null;
    elapsedTime: number;
}

function formatTimestamp(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function FilmTranscript({
    messages,
    interimText,
    currentlySpeakingId,
    elapsedTime
}: FilmTranscriptProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isNearBottom, setIsNearBottom] = useState(true);

    // Auto-scroll to bottom when new messages arrive (if user is near bottom)
    useEffect(() => {
        if (scrollRef.current && isNearBottom) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, interimText, isNearBottom]);

    // Detect if user is near bottom
    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            setIsNearBottom(distanceFromBottom < 100);
        }
    };

    return (
        <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="film-transcript"
            style={{
                height: '100%',
                overflowY: 'auto',
                backgroundColor: '#0a0a0a',
                color: '#e0e0e0',
                fontFamily: "'Courier New', monospace",
                fontSize: '0.95rem',
                lineHeight: '1.8',
                padding: '2rem',
                scrollBehavior: 'smooth'
            }}
        >
            {messages.map((message) => {
                const isSpeaking = currentlySpeakingId === message.id;
                const isRecruiter = message.type === "recruiter";

                return (
                    <div
                        key={message.id}
                        className={`transcript-line ${isSpeaking ? 'speaking-highlight' : ''}`}
                        style={{
                            marginBottom: '1.5rem',
                            paddingLeft: isSpeaking ? '1rem' : '0',
                            borderLeft: isSpeaking ? '3px solid #60a5fa' : 'none',
                            backgroundColor: isSpeaking ? 'rgba(96, 165, 250, 0.05)' : 'transparent',
                            transition: 'all 0.3s ease',
                            animation: isSpeaking ? 'pulse 1.5s ease-in-out infinite' : 'none'
                        }}
                    >
                        <span
                            className="timestamp"
                            style={{
                                color: '#666',
                                marginRight: '0.75rem',
                                fontSize: '0.85rem'
                            }}
                        >
                            [{formatTimestamp(message.timestamp)}]
                        </span>
                        <span
                            className={isRecruiter ? 'speaker-recruiter' : 'speaker-candidate'}
                            style={{
                                color: isRecruiter ? '#60a5fa' : '#34d399',
                                fontWeight: 'bold',
                                marginRight: '0.5rem'
                            }}
                        >
                            {isRecruiter ? 'RECRUITER:' : 'CANDIDATE:'}
                        </span>
                        <span style={{ color: '#e0e0e0' }}>
                            {message.text}
                        </span>
                    </div>
                );
            })}

            {/* Interim text while listening */}
            {interimText && (
                <div
                    className="transcript-line interim-text"
                    style={{
                        marginBottom: '1.5rem',
                        opacity: 0.6,
                        fontStyle: 'italic'
                    }}
                >
                    <span
                        className="timestamp"
                        style={{
                            color: '#666',
                            marginRight: '0.75rem',
                            fontSize: '0.85rem'
                        }}
                    >
                        [{formatTimestamp(elapsedTime * 1000)}]
                    </span>
                    <span
                        className="speaker-candidate"
                        style={{
                            color: '#34d399',
                            fontWeight: 'bold',
                            marginRight: '0.5rem'
                        }}
                    >
                        CANDIDATE (listening…):
                    </span>
                    <span style={{ color: '#a0a0a0' }}>
                        {interimText}
                    </span>
                </div>
            )}

            {/* Pulse animation */}
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% {
                        background-color: rgba(96, 165, 250, 0.05);
                    }
                    50% {
                        background-color: rgba(96, 165, 250, 0.15);
                    }
                }
            `}</style>
        </div>
    );
}
