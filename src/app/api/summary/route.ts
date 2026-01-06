import { NextResponse } from 'next/server';
import * as sheetsData from '@/lib/sheets/data';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'monthly' or 'category'
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

        if (type === 'category') {
            const summary = await sheetsData.getCategorySummary(year, month);
            return NextResponse.json({ data: summary });
        } else {
            const summary = await sheetsData.getMonthlySummary(year, month);
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
