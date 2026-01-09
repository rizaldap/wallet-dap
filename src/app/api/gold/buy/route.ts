import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import * as goldData from '@/lib/supabase/gold';

// POST /api/gold/buy - Buy gold
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        if (!body.platform || !body.grams || !body.pricePerGram || !body.walletId) {
            return NextResponse.json(
                { error: 'Missing required fields: platform, grams, pricePerGram, walletId' },
                { status: 400 }
            );
        }

        const transaction = await goldData.buyGold({
            user_id: user.id,
            platform: body.platform,
            grams: body.grams,
            price_per_gram: body.pricePerGram,
            wallet_id: body.walletId,
            notes: body.notes,
            date: body.date,
        });

        return NextResponse.json({ data: transaction });
    } catch (error) {
        console.error('Error buying gold:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to buy gold' },
            { status: 500 }
        );
    }
}
