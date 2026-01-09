import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import * as goldData from '@/lib/supabase/gold';

// POST /api/gold/sell - Sell gold
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        if (!body.holdingId || !body.grams || !body.pricePerGram || !body.walletId) {
            return NextResponse.json(
                { error: 'Missing required fields: holdingId, grams, pricePerGram, walletId' },
                { status: 400 }
            );
        }

        const transaction = await goldData.sellGold({
            user_id: user.id,
            holding_id: body.holdingId,
            grams: body.grams,
            price_per_gram: body.pricePerGram,
            wallet_id: body.walletId,
            notes: body.notes,
            date: body.date,
        });

        return NextResponse.json({ data: transaction });
    } catch (error) {
        console.error('Error selling gold:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to sell gold' },
            { status: 500 }
        );
    }
}
