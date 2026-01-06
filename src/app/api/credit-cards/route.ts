import { NextResponse } from 'next/server';
import * as sheetsData from '@/lib/sheets/data';

export async function GET() {
    try {
        const cards = await sheetsData.getCreditCards();
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
        const body = await request.json();
        const card = await sheetsData.createCreditCard(body);
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
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'Missing credit card id' }, { status: 400 });
        }
        await sheetsData.deleteCreditCard(id);
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
        const body = await request.json();
        const { id, ...updates } = body;
        if (!id) {
            return NextResponse.json({ error: 'Missing credit card id' }, { status: 400 });
        }
        const card = await sheetsData.updateCreditCard(id, updates);
        return NextResponse.json({ data: card });
    } catch (error) {
        console.error('Error updating credit card:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update credit card' },
            { status: 500 }
        );
    }
}
