import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const requestId = Math.random().toString(36).substring(7);
    const sessionId = params.id;

    try {
        const session = await prisma.interviewSession.findUnique({
            where: { id: sessionId },
            include: {
                messages: {
                    orderBy: {
                        timestampMs: 'asc'
                    }
                },
                finalReport: true
            }
        });

        if (!session) {
            return NextResponse.json({
                ok: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Session not found',
                    requestId
                }
            }, { status: 404 });
        }

        // Convert BigInt to number for JSON serialization
        const messagesWithNumbers = session.messages.map(msg => ({
            ...msg,
            timestampMs: Number(msg.timestampMs)
        }));

        return NextResponse.json({
            ok: true,
            session: {
                ...session,
                messages: messagesWithNumbers
            }
        });

    } catch (error: any) {
        console.error(`[Sessions] Get session failed (${requestId}):`, error);

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
                message: error.message || 'Failed to get session',
                requestId
            }
        }, { status: 500 });
    }
}
