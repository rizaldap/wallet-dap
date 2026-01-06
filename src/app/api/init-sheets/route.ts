import { NextResponse } from 'next/server';
import initializeSpreadsheet from '@/lib/sheets/init-sheets';

export async function POST() {
    try {
        await initializeSpreadsheet();
        return NextResponse.json({ success: true, message: 'Spreadsheet initialized successfully!' });
    } catch (error) {
        console.error('Error initializing spreadsheet:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to initialize spreadsheet' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Use POST to initialize the spreadsheet',
        instructions: [
            '1. Create a new Google Sheets spreadsheet',
            '2. Share it with your service account email (Editor access)',
            '3. Copy the spreadsheet ID from the URL',
            '4. Add SPREADSHEET_ID to your .env file',
            '5. Call POST /api/init-sheets to initialize'
        ]
    });
}
