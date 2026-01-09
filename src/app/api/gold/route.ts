import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import * as goldData from '@/lib/supabase/gold';

// GET /api/gold - Get all gold holdings for current user
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const summary = await goldData.getGoldSummary(user.id);
        return NextResponse.json({ data: summary });
    } catch (error) {
        console.error('Error fetching gold holdings:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch gold holdings' },
            { status: 500 }
        );
    }
}
