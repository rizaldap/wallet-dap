import { NextResponse } from 'next/server';
import * as sheetsData from '@/lib/sheets/data';

export async function GET() {
    try {
        const categories = await sheetsData.getCategories();
        return NextResponse.json({ data: categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const category = await sheetsData.createCategory(body);
        return NextResponse.json({ data: category });
    } catch (error) {
        console.error('Error creating category:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create category' },
            { status: 500 }
        );
    }
}
