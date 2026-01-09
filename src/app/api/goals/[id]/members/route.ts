import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import * as goalsData from '@/lib/supabase/goals';

// GET /api/goals/[id]/members - List members
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const members = await goalsData.getGoalMembers(id);
        return NextResponse.json({ data: members });
    } catch (error) {
        console.error('Error fetching goal members:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch members' },
            { status: 500 }
        );
    }
}

// POST /api/goals/[id]/members - Invite member
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { email, role } = body;

        // Verify inviter is owner/admin (RLS will also check, but good to check here)
        // For simplicity, we trust RLS and logic inside inviteMember

        const member = await goalsData.inviteMember(id, email, role || 'viewer', user.id);

        if (!member) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Log activity
        await goalsData.logActivity({
            goal_id: id,
            user_id: user.id,
            action: 'member_invited',
            details: { email, role },
        });

        return NextResponse.json({ data: member });
    } catch (error) {
        console.error('Error inviting member:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to invite member' },
            { status: 500 }
        );
    }
}

// DELETE /api/goals/[id]/members - Remove member
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const userIdToRemove = searchParams.get('userId');

        if (!userIdToRemove) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        await goalsData.removeMember(id, userIdToRemove);

        // Log activity
        await goalsData.logActivity({
            goal_id: id,
            user_id: user.id,
            action: 'member_removed',
            details: { removed_user_id: userIdToRemove },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing member:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to remove member' },
            { status: 500 }
        );
    }
}
