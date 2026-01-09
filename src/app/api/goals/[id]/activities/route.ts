import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import * as goalsData from '@/lib/supabase/goals';

// GET /api/goals/[id]/activities - List activities
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
        const activities = await goalsData.getGoalActivities(id);
        return NextResponse.json({ data: activities });
    } catch (error) {
        console.error('Error fetching goal activities:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch activities' },
            { status: 500 }
        );
    }
}
