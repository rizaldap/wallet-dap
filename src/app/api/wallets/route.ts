import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import * as supabaseData from '@/lib/supabase/data';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const wallets = await supabaseData.getWallets(user.id);
        return NextResponse.json({ data: wallets });
    } catch (error) {
        console.error('Error fetching wallets:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch wallets' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const wallet = await supabaseData.createWallet({
            ...body,
            userId: user.id,
        });
        return NextResponse.json({ data: wallet });
    } catch (error) {
        console.error('Error creating wallet:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create wallet' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'Missing wallet id' }, { status: 400 });
        }
        await supabaseData.deleteWallet(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting wallet:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete wallet' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updates } = body;
        if (!id) {
            return NextResponse.json({ error: 'Missing wallet id' }, { status: 400 });
        }
        const wallet = await supabaseData.updateWallet(id, updates);
        return NextResponse.json({ data: wallet });
    } catch (error) {
        console.error('Error updating wallet:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update wallet' },
            { status: 500 }
        );
    }
}
