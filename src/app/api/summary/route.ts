import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import * as supabaseData from '@/lib/supabase/data';

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'monthly' or 'category'
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

        if (type === 'category') {
            const summary = await supabaseData.getCategorySummary(user.id, year, month);
            return NextResponse.json({ data: summary });
        } else {
            const summary = await supabaseData.getMonthlySummary(user.id, year, month);
            return NextResponse.json({ data: summary });
        }
    } catch (error) {
        console.error('Error fetching summary:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch summary' },
            { status: 500 }
        );
    }
}
