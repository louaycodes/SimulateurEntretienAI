"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Download,
    TrendingUp,
    TrendingDown,
    CheckCircle,
    AlertCircle,
    Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { SessionData } from "@/lib/types";
import { fetchSession } from "@/lib/mock-api";
import { clsx } from "clsx";

export default function SessionReviewPage() {
    const params = useParams();
    const sessionId = params.id as string;
    const [session, setSession] = useState<SessionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSession = async () => {
            try {
                const data = await fetchSession(sessionId);
                setSession(data);
            } catch (error) {
                console.error("Failed to load session:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
    }, [sessionId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
                <div className="max-w-6xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-64" />
                    <div className="grid md:grid-cols-3 gap-6">
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                    </div>
                    <CardSkeleton />
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <Card>
                    <CardContent className="text-center py-12">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Session Not Found
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            The session you're looking for doesn't exist.
                        </p>
                        <Link href="/dashboard">
                            <Button>Go to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const impressionColors = {
        Hire: "text-green-500",
        "Lean Hire": "text-yellow-500",
        "No Hire": "text-red-500",
    };

    const scoreColor = (score: number) => {
        if (score >= 80) return "text-green-500";
        if (score >= 60) return "text-yellow-500";
        return "text-red-500";
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm" className="mb-4">
                                <ArrowLeft className="w-4 h-4" />
                                Back to Dashboard
                            </Button>
                        </Link>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                            Session Review
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {new Date(session.startTime).toLocaleDateString()} •{" "}
                            {session.config.role} • {session.config.level}
                        </p>
                    </div>
                    <Button variant="outline">
                        <Download className="w-5 h-5" />
                        Download Report
                    </Button>
                </div>

                {/* Overall Impression */}
                {session.feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <Card variant="glass" className="text-center py-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Recruiter Impression
                            </h2>
                            <p
                                className={clsx(
                                    "text-5xl font-bold mb-4",
                                    impressionColors[session.feedback.impression]
                                )}
                            >
                                {session.feedback.impression}
                            </p>
                        </Card>
                    </motion.div>
                )}

                {/* Scores */}
                {session.scores && (
                    <div className="grid md:grid-cols-5 gap-4 mb-8">
                        {Object.entries(session.scores).map(([key, value], index) => (
                            <motion.div
                                key={key}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="text-center">
                                    <CardContent className="py-6">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 capitalize">
                                            {key.replace(/([A-Z])/g, " $1").trim()}
                                        </p>
                                        <p className={clsx("text-4xl font-bold", scoreColor(value))}>
                                            {value}
                                        </p>
                                        <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-primary transition-all duration-500"
                                                style={{ width: `${value}%` }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Feedback */}
                {session.feedback && (
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-500">
                                        <TrendingUp className="w-5 h-5" />
                                        What You Did Well
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-3">
                                        {session.feedback.strengths.map((strength, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span className="text-gray-700 dark:text-gray-300">
                                                    {strength}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-500">
                                        <TrendingDown className="w-5 h-5" />
                                        Areas for Improvement
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-3">
                                        {session.feedback.improvements.map((improvement, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                                <span className="text-gray-700 dark:text-gray-300">
                                                    {improvement}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {/* Timeline */}
                {session.timeline && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary-500" />
                                    Interview Timeline
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {session.timeline.map((event, index) => (
                                        <div key={index} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className="w-3 h-3 bg-primary-500 rounded-full" />
                                                {index < session.timeline!.length - 1 && (
                                                    <div className="w-0.5 h-full bg-gray-300 dark:bg-gray-700 mt-2" />
                                                )}
                                            </div>
                                            <div className="flex-1 pb-6">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(event.timestamp).toLocaleTimeString()}
                                                </p>
                                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {event.label}
                                                </h4>
                                                <p className="text-gray-600 dark:text-gray-400">
                                                    {event.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Transcript */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>Full Transcript</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {session.transcript.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={clsx(
                                            "flex",
                                            msg.type === "recruiter" ? "justify-start" : "justify-end"
                                        )}
                                    >
                                        <div
                                            className={clsx(
                                                "max-w-[80%] px-4 py-3 rounded-2xl",
                                                msg.type === "recruiter"
                                                    ? "bg-gray-100 dark:bg-gray-800"
                                                    : "bg-primary-500 text-gray-900"
                                            )}
                                        >
                                            <p className="text-sm font-semibold mb-1">
                                                {msg.type === "recruiter" ? "Recruiter" : "You"}
                                            </p>
                                            <p className="text-sm">{msg.text}</p>
                                            <p className="text-xs opacity-70 mt-1">
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Actions */}
                <div className="mt-8 flex justify-center gap-4">
                    <Link href="/onboarding">
                        <Button size="lg">Start Another Interview</Button>
                    </Link>
                    <Link href="/dashboard">
                        <Button size="lg" variant="outline">
                            View All Sessions
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
