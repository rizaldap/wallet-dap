import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import * as goalsData from '@/lib/supabase/goals';

// GET /api/goals/[id]/budgets - Get budgets for a goal
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
        const budgets = await goalsData.getGoalBudgets(id);
        return NextResponse.json({ data: budgets });
    } catch (error) {
        console.error('Error fetching budgets:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch budgets' },
            { status: 500 }
        );
    }
}

// POST /api/goals/[id]/budgets - Create a budget item
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
        const { name, amount, vendor, dueDate, notes, description, priority } = await request.json();

        // Validate input
        if (!name || !amount) {
            return NextResponse.json({ error: 'Name and amount are required' }, { status: 400 });
        }

        const budget = await goalsData.createGoalBudget({
            goal_id: id,
            name: name,
            amount: amount,
            vendor: vendor,
            due_date: dueDate,
            notes: notes,
            description: description,
            priority: priority || 'medium',
            created_by: user.id,
            created_by_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
        });

        // Log activity
        await goalsData.logActivity({
            goal_id: id,
            user_id: user.id,
            action: 'budget_added',
            details: { name: budget.name, amount: budget.amount },
        });

        return NextResponse.json({ data: budget });
    } catch (error) {
        console.error('Error creating budget:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create budget' },
            { status: 500 }
        );
    }
}

// PATCH /api/goals/[id]/budgets - Update a budget item
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: goalId } = await params;
        const body = await request.json();
        const { budgetId, ...updates } = body;

        if (!budgetId) {
            return NextResponse.json({ error: 'Missing budget id' }, { status: 400 });
        }

        const budget = await goalsData.updateGoalBudget(budgetId, updates);

        // Log activity if status changed
        if (updates.status) {
            await goalsData.logActivity({
                goal_id: goalId,
                user_id: user.id,
                action: 'budget_status_changed',
                details: { name: budget.name, status: budget.status },
            });
        }

        return NextResponse.json({ data: budget });
    } catch (error) {
        console.error('Error updating budget:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update budget' },
            { status: 500 }
        );
    }
}

// DELETE /api/goals/[id]/budgets - Delete a budget item
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: goalId } = await params;
        const { searchParams } = new URL(request.url);
        const budgetId = searchParams.get('budgetId');

        if (!budgetId) {
            return NextResponse.json({ error: 'Missing budget id' }, { status: 400 });
        }

        await goalsData.deleteGoalBudget(budgetId);

        // Log activity
        await goalsData.logActivity({
            goal_id: goalId,
            user_id: user.id,
            action: 'budget_deleted',
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting budget:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete budget' },
            { status: 500 }
        );
    }
}
