import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
    const requestId = Math.random().toString(36).substring(7);

    try {
        const body = await request.json();
        const { role, level, interviewType, language, durationMinutes, duration } = body;

        // Validation
        if (!role || !level || !interviewType || !language) {
            return NextResponse.json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Missing required fields',
                    requestId
                }
            }, { status: 400 });
        }

        // Create session in database
        const session = await prisma.interviewSession.create({
            data: {
                role,
                level,
                interviewType,
                language,
                durationMinutes: durationMinutes || duration || 30,
                status: 'running'
            }
        });

        console.log(`[Sessions] Created session ${session.id} - ${role} (${level})`);

        return NextResponse.json({
            ok: true,
            sessionId: session.id
        });

    } catch (error: any) {
        console.error(`[Sessions] Create failed (${requestId}):`, error);

        // Check if DB is unavailable
        if (error.code === 'P1001' || error.code === 'P1002') {
            return NextResponse.json({
                ok: false,
                error: {
                    code: 'DB_UNAVAILABLE',
                    message: 'Database is unavailable. Session will not be persisted.',
                    hint: 'Start PostgreSQL with: docker compose up -d',
                    requestId
                }
            }, { status: 503 });
        }

        return NextResponse.json({
            ok: false,
            error: {
                code: 'SERVER_ERROR',
                message: error.message || 'Failed to create session',
                requestId
            }
        }, { status: 500 });
    }
}
