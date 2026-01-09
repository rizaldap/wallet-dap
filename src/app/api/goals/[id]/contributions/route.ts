import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import * as goalsData from '@/lib/supabase/goals';

// GET /api/goals/[id]/contributions - Get contributions for a goal
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
        const contributions = await goalsData.getGoalContributions(id);
        return NextResponse.json({ data: contributions });
    } catch (error) {
        console.error('Error fetching contributions:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch contributions' },
            { status: 500 }
        );
    }
}

// POST /api/goals/[id]/contributions - Add a contribution
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

        // Create contribution (this also creates expense transaction and updates goal)
        const contribution = await goalsData.addContribution({
            goal_id: id,
            user_id: user.id,
            amount: body.amount,
            wallet_id: body.walletId,
            notes: body.notes,
            user_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
        });

        // Log activity
        await goalsData.logActivity({
            goal_id: id,
            user_id: user.id,
            action: 'contribution_added',
            details: { amount: body.amount },
        });

        return NextResponse.json({ data: contribution });
    } catch (error) {
        console.error('Error adding contribution:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to add contribution' },
            { status: 500 }
        );
    }
}
