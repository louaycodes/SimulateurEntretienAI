import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
    const requestId = Math.random().toString(36).substring(7);

    try {
        const sessions = await prisma.interviewSession.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                createdAt: true,
                endedAt: true,
                role: true,
                level: true,
                interviewType: true,
                status: true,
                recruiterImpression: true,
                overallScore: true
            }
        });

        return NextResponse.json({
            ok: true,
            sessions
        });

    } catch (error: any) {
        console.error(`[Sessions] List failed (${requestId}):`, error);

        if (error.code === 'P1001' || error.code === 'P1002') {
            return NextResponse.json({
                ok: false,
                error: {
                    code: 'DB_UNAVAILABLE',
                    message: 'Database is unavailable',
                    requestId
                }
            }, { status: 503 });
        }

        return NextResponse.json({
            ok: false,
            error: {
                code: 'SERVER_ERROR',
                message: error.message || 'Failed to list sessions',
                requestId
            }
        }, { status: 500 });
    }
}
