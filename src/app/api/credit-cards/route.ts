import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import * as supabaseData from '@/lib/supabase/data';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const cards = await supabaseData.getCreditCards(user.id);
        return NextResponse.json({ data: cards });
    } catch (error) {
        console.error('Error fetching credit cards:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch credit cards' },
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
        const card = await supabaseData.createCreditCard({
            ...body,
            userId: user.id,
        });
        return NextResponse.json({ data: card });
    } catch (error) {
        console.error('Error creating credit card:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create credit card' },
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
            return NextResponse.json({ error: 'Missing credit card id' }, { status: 400 });
        }
        await supabaseData.deleteCreditCard(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting credit card:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete credit card' },
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
            return NextResponse.json({ error: 'Missing credit card id' }, { status: 400 });
        }
        const card = await supabaseData.updateCreditCard(id, updates);
        return NextResponse.json({ data: card });
    } catch (error) {
        console.error('Error updating credit card:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update credit card' },
            { status: 500 }
        );
    }
}
