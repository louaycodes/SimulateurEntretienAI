"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    TrendingUp,
    Calendar,
    Target,
    Award,
    Play,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { MainLayout } from "@/components/layout/MainLayout";
import { SessionData } from "@/lib/types";
import { fetchDashboardStats } from "@/lib/mock-api";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { clsx } from "clsx";

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await fetchDashboardStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to load stats:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadStats();
    }, []);

    const statCards = stats
        ? [
            {
                icon: Calendar,
                label: "Total Sessions",
                value: stats.totalSessions,
                color: "text-blue-500",
            },
            {
                icon: TrendingUp,
                label: "Average Score",
                value: `${stats.avgScore}%`,
                color: "text-green-500",
            },
            {
                icon: Award,
                label: "Current Streak",
                value: `${stats.streak} days`,
                color: "text-yellow-500",
            },
            {
                icon: Target,
                label: "Top Weakness",
                value: stats.topWeakness,
                color: "text-red-500",
            },
        ]
        : [];

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                            Dashboard
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Track your interview practice progress
                        </p>
                    </div>
                    <Link href="/onboarding">
                        <Button size="lg" className="group">
                            <Play className="w-5 h-5" />
                            New Interview
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    {isLoading
                        ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
                        : statCards.map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card hover>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <Icon className={clsx("w-8 h-8", stat.color)} />
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                                {stat.label}
                                            </p>
                                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                                {stat.value}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                </div>

                {/* Recent Sessions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Sessions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-4">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <CardSkeleton key={i} />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {stats.recentSessions.map((session: SessionData) => (
                                        <Link key={session.id} href={`/session/${session.id}`}>
                                            <div className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group cursor-pointer">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                                            {session.config.role} Interview
                                                        </h3>
                                                        <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs">
                                                            {session.config.level}
                                                        </span>
                                                        <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs">
                                                            {session.config.interviewType}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {new Date(session.startTime).toLocaleDateString()} •{" "}
                                                        {Math.floor(
                                                            ((session.endTime || Date.now()) - session.startTime) /
                                                            60000
                                                        )}{" "}
                                                        minutes
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {session.scores && (
                                                        <div className="text-right">
                                                            <p className="text-2xl font-bold text-primary-500">
                                                                {session.scores.overall}
                                                            </p>
                                                            <p className="text-xs text-gray-500">Score</p>
                                                        </div>
                                                    )}
                                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {!isLoading && stats.recentSessions.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                                        No sessions yet. Start your first interview!
                                    </p>
                                    <Link href="/onboarding">
                                        <Button>Start Interview</Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </MainLayout>
    );
}
