import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: goalId } = await params;

        // 1. Get User's Total Contributions
        const { data: contributions } = await supabase
            .from('goal_contributions')
            .select('amount')
            .eq('goal_id', goalId)
            .eq('user_id', user.id);

        const totalContributed = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

        // 2. Get User's Total Payments (via budget items)
        const { data: payments } = await supabase
            .from('goal_budget_payments')
            .select(`
                amount,
                goal_budgets!inner (
                    goal_id
                )
            `)
            .eq('goal_budgets.goal_id', goalId)
            .eq('user_id', user.id);

        const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const availableBalance = totalContributed - totalPaid;

        return NextResponse.json({
            data: {
                totalContributed,
                totalPaid,
                availableBalance
            }
        });

    } catch (err) {
        console.error('Balance Error:', err);
        return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
    }
}
