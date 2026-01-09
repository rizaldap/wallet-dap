import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import * as goldData from '@/lib/supabase/gold';

// GET /api/gold/transactions - Get gold transaction history
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam) : 50;

        const transactions = await goldData.getGoldTransactions(user.id, limit);
        return NextResponse.json({ data: transactions });
    } catch (error) {
        console.error('Error fetching gold transactions:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch gold transactions' },
            { status: 500 }
        );
    }
}
