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
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam) : undefined;

        const transactions = await supabaseData.getTransactions(user.id, limit);
        return NextResponse.json({ data: transactions });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch transactions' },
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
        const transaction = await supabaseData.createTransaction({
            ...body,
            userId: user.id,
        });
        return NextResponse.json({ data: transaction });
    } catch (error) {
        console.error('Error creating transaction:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create transaction' },
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
            return NextResponse.json({ error: 'Missing transaction id' }, { status: 400 });
        }
        await supabaseData.deleteTransaction(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete transaction' },
            { status: 500 }
        );
    }
}
