import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import * as goalsData from '@/lib/supabase/goals';

// GET /api/goals - List all goals for current user or get single goal
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (id) {
            const goal = await goalsData.getGoalById(id);
            if (!goal) {
                return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
            }
            // Check ownership/membership is handled by RLS, but if getGoalById returns null/empty if not allowed
            return NextResponse.json({ data: goal });
        }

        const goals = await goalsData.getGoals(user.id);
        return NextResponse.json({ data: goals });
    } catch (error) {
        console.error('Error fetching goals:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch goals' },
            { status: 500 }
        );
    }
}

// POST /api/goals - Create a new goal
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const goal = await goalsData.createGoal({
            owner_id: user.id,
            name: body.name,
            icon: body.icon,
            color: body.color,
            target_amount: body.targetAmount,
            deadline: body.deadline,
            description: body.description,
            owner_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Owner',
            owner_email: user.email,
        });

        // Log activity
        await goalsData.logActivity({
            goal_id: goal.id,
            user_id: user.id,
            action: 'goal_created',
            details: { name: goal.name },
        });

        return NextResponse.json({ data: goal });
    } catch (error) {
        console.error('Error creating goal:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create goal' },
            { status: 500 }
        );
    }
}

// PATCH /api/goals - Update a goal
export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing goal id' }, { status: 400 });
        }

        const goal = await goalsData.updateGoal(id, {
            name: updates.name,
            icon: updates.icon,
            color: updates.color,
            target_amount: updates.targetAmount,
            deadline: updates.deadline,
            description: updates.description,
            status: updates.status,
        });

        return NextResponse.json({ data: goal });
    } catch (error) {
        console.error('Error updating goal:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update goal' },
            { status: 500 }
        );
    }
}

// DELETE /api/goals - Delete a goal
export async function DELETE(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing goal id' }, { status: 400 });
        }

        await goalsData.deleteGoal(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting goal:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete goal' },
            { status: 500 }
        );
    }
}
