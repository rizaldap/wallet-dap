import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
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
        const { budgetId, amount, notes } = await request.json();

        if (!budgetId || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid payment details' }, { status: 400 });
        }

        // 1. Calculate User's "Goal Balance"
        // Sum(Contributions) - Sum(Existing Payments)

        const { data: contributions, error: contribError } = await supabase
            .from('goal_contributions')
            .select('amount')
            .eq('goal_id', goalId)
            .eq('user_id', user.id);

        if (contribError) throw contribError;

        const totalContributed = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

        // We need to fetch ALL payments this user made for ANY budget item in this goal
        // Join goal_budgets to filter by goal_id
        const { data: payments, error: payError } = await supabase
            .from('goal_budget_payments')
            .select(`
                amount,
                goal_budgets!inner (
                    goal_id
                )
            `)
            .eq('goal_budgets.goal_id', goalId) // Filter payments for this goal
            .eq('user_id', user.id);

        if (payError) throw payError;

        const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const availableBalance = totalContributed - totalPaid;

        if (availableBalance < amount) {
            return NextResponse.json({
                error: `Insufficient goal funds. You have ${availableBalance}, tried to pay ${amount}.`
            }, { status: 400 });
        }

        // 2. Insert Payment
        const { error: insertError } = await supabase
            .from('goal_budget_payments')
            .insert({
                goal_budget_id: budgetId,
                user_id: user.id,
                amount: amount,
                notes: notes
            });

        if (insertError) throw insertError;

        // 3. Update Budget Item Totals
        // Re-calculate total paid for this specific budget item
        const { data: itemPayments, error: itemPayError } = await supabase
            .from('goal_budget_payments')
            .select('amount')
            .eq('goal_budget_id', budgetId);

        if (itemPayError) throw itemPayError;

        const itemTotalPaid = itemPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        // Get Budget Total Amount
        const { data: budgetItem, error: budgetError } = await supabase
            .from('goal_budgets')
            .select('amount')
            .eq('id', budgetId)
            .single();

        if (budgetError) throw budgetError;

        const isPaid = itemTotalPaid >= (budgetItem.amount - 0.01); // Epsilon for float compare
        const newStatus = isPaid ? 'paid' : 'partial';

        const { error: updateError } = await supabase
            .from('goal_budgets')
            .update({
                paid_amount: itemTotalPaid,
                status: newStatus
            })
            .eq('id', budgetId);

        if (updateError) throw updateError;

        // Log Activity
        await supabase.from('goal_activities').insert({
            goal_id: goalId,
            user_id: user.id,
            action: 'budget_payment',
            details: { budget_id: budgetId, amount, status: newStatus }
        });

        return NextResponse.json({
            success: true,
            availableBalance: availableBalance - amount,
            itemTotalPaid,
            newStatus
        });

    } catch (err) {
        console.error('Payment Error:', err);
        return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
    }
}
