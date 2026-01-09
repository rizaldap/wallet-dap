import { createClient } from './server';

// ============ TYPES ============

export interface Goal {
    id: string;
    owner_id: string;
    name: string;
    icon: string;
    color: string;
    target_amount: number;
    current_amount: number;
    deadline: string | null;
    status: 'active' | 'completed' | 'cancelled';
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface GoalMember {
    id: string;
    goal_id: string;
    user_id: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
    invited_by: string | null;
    invited_at: string;
    accepted_at: string | null;
    user_name?: string;
    user_email?: string;
    user?: { email: string; raw_user_meta_data: { name?: string; avatar_url?: string } };
}

export interface GoalBudget {
    id: string;
    goal_id: string;
    name: string;
    amount: number;
    paid_amount: number;
    vendor: string | null;
    status: 'pending' | 'partial' | 'paid';
    due_date: string | null;
    notes: string | null;
    description: string | null;
    priority: 'low' | 'medium' | 'high';
    created_by: string | null;
    created_by_name: string | null;
    created_at: string;
}

// ... (Goal Contributions & Goal Activities interfaces remain unchanged)

// ...



export interface GoalContribution {
    id: string;
    goal_id: string;
    user_id: string;
    amount: number;
    wallet_id: string;
    transaction_id: string | null;
    notes: string | null;
    created_at: string;
    wallet?: { name: string; icon: string };
}

export interface GoalActivity {
    id: string;
    goal_id: string;
    user_id: string;
    action: string;
    details: Record<string, unknown>;
    created_at: string;
}

// ============ GOALS ============

export async function getGoals(userId: string): Promise<Goal[]> {
    const supabase = await createClient();
    // Get goals where user is owner or member
    // Note: RLS policies already filter this.
    const { data, error } = await supabase
        .from('goals')
        .select(`
      *,
      goal_members(user_id, role, accepted_at)
    `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function getGoalById(goalId: string): Promise<Goal | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();

    if (error) throw error;
    return data;
}

export async function createGoal(goal: {
    owner_id: string;
    name: string;
    icon?: string;
    color?: string;
    target_amount: number;
    deadline?: string;
    description?: string;
    owner_name?: string;
    owner_email?: string;
}): Promise<Goal> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('goals')
        .insert({
            owner_id: goal.owner_id,
            name: goal.name,
            icon: goal.icon || '🎯',
            color: goal.color || '#6366f1',
            target_amount: goal.target_amount,
            deadline: goal.deadline,
            description: goal.description,
        })
        .select()
        .single();

    if (error) throw error;

    // Add owner as member
    await supabase.from('goal_members').insert({
        goal_id: data.id,
        user_id: goal.owner_id,
        role: 'owner',
        accepted_at: new Date().toISOString(),
        user_name: goal.owner_name,
        user_email: goal.owner_email,
    });

    return data;
}

export async function updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('goals')
        .update({
            name: updates.name,
            icon: updates.icon,
            color: updates.color,
            target_amount: updates.target_amount,
            deadline: updates.deadline,
            description: updates.description,
            status: updates.status,
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteGoal(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============ GOAL MEMBERS ============

export async function getGoalMembers(goalId: string): Promise<GoalMember[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('goal_members')
        .select('*')
        .eq('goal_id', goalId)
        .order('role', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function inviteMember(goalId: string, email: string, role: string, invitedBy: string, inviteeName?: string): Promise<GoalMember | null> {
    const supabase = await createClient();

    // Use RPC to securely get user ID by email
    const { data: userIdData, error: userError } = await supabase
        .rpc('get_user_id_by_email', { email_input: email })
        .single();

    if (userError || !userIdData) {
        console.error("User lookup failed:", userError);
        return null;
    }

    // Type assertion for RPC result if needed, though supabase usually infers it if generated types are present.
    // Assuming userIdData has structure { id: string } based on the RPC definition.
    const targetUserId = (userIdData as { id: string }).id;

    const { data, error } = await supabase
        .from('goal_members')
        .insert({
            goal_id: goalId,
            user_id: targetUserId,
            role,
            invited_by: invitedBy,
            user_email: email,
            user_name: inviteeName || email.split('@')[0],
        })
        .select()
        .single();

    if (error) {
        // Handle unique violation (already a member) gracefully if needed
        if (error.code === '23505') throw new Error('User is already a member');
        throw error;
    }
    return data;
}

export async function createInvitation(goalId: string): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('create_invitation', {
        p_goal_id: goalId
    });

    if (error) throw error;
    return data;
}

export async function claimInvitation(token: string): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('claim_invitation', {
        p_token: token
    });

    if (error) throw error;
    return data;
}

export async function acceptInvitation(goalId: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('goal_members')
        .update({ accepted_at: new Date().toISOString() })
        .eq('goal_id', goalId)
        .eq('user_id', userId);

    if (error) throw error;
}

export async function removeMember(goalId: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('goal_members')
        .delete()
        .eq('goal_id', goalId)
        .eq('user_id', userId);

    if (error) throw error;
}

// ============ GOAL BUDGETS ============

export async function getGoalBudgets(goalId: string): Promise<GoalBudget[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('goal_budgets')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function createGoalBudget(budget: {
    goal_id: string;
    name: string;
    amount: number;
    vendor?: string;
    due_date?: string;
    notes?: string;
    description?: string;
    priority?: string;
    created_by: string;
    created_by_name: string;
}): Promise<GoalBudget> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('goal_budgets')
        .insert(budget)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateGoalBudget(id: string, updates: Partial<GoalBudget>): Promise<GoalBudget> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('goal_budgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteGoalBudget(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('goal_budgets')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============ GOAL CONTRIBUTIONS ============

export async function getGoalContributions(goalId: string): Promise<GoalContribution[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('goal_contributions')
        .select(`
      *,
      wallet:wallets(name, icon)
    `)
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function addContribution(contribution: {
    goal_id: string;
    user_id: string;
    user_name: string;
    amount: number;
    wallet_id: string;
    notes?: string;
}): Promise<GoalContribution> {
    const supabase = await createClient();
    // 1. Create expense transaction in wallet
    const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert({
            user_id: contribution.user_id,
            wallet_id: contribution.wallet_id,
            type: 'expense',
            amount: contribution.amount,
            description: `Kontribusi Goal`,
            date: new Date().toISOString().split('T')[0],
            notes: contribution.notes,
        })
        .select()
        .single();

    if (txError) throw txError;

    // 2. Create contribution record
    const { data, error } = await supabase
        .from('goal_contributions')
        .insert({
            ...contribution,
            transaction_id: txData.id,
        })
        .select()
        .single();

    if (error) throw error;

    // 3. Update goal current_amount
    await supabase.rpc('increment_goal_amount', {
        goal_id: contribution.goal_id,
        amount: contribution.amount,
    });

    return data;
}

// ============ GOAL ACTIVITIES ============

export async function getGoalActivities(goalId: string, limit = 20): Promise<GoalActivity[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('goal_activities')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

export async function logActivity(activity: {
    goal_id: string;
    user_id: string;
    action: string;
    details?: Record<string, unknown>;
}): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('goal_activities')
        .insert({
            goal_id: activity.goal_id,
            user_id: activity.user_id,
            action: activity.action,
            details: activity.details || {},
        });

    if (error) throw error;
}
