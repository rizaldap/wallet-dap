import { NextResponse } from 'next/server';
import { sheets, SPREADSHEET_ID, SHEET_ESSENTIALS, SECTIONS } from '@/lib/sheets/client';

// Settings are stored in a dedicated section in Essentials sheet
const SETTINGS_SECTION = '[SETTINGS]';

async function getSettingsRowRange() {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_ESSENTIALS}!A:A`,
    });

    const rows = response.data.values || [];

    for (let i = 0; i < rows.length; i++) {
        if (rows[i][0]?.trim() === SETTINGS_SECTION) {
            return { startRow: i + 1, dataRow: i + 3 }; // +1 for 1-index, +2 for header, +3 for data
        }
    }

    return null;
}

export async function GET() {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_ESSENTIALS}!A:Z`,
        });

        const rows = response.data.values || [];
        let inSettings = false;
        let headers: string[] = [];
        let settings: Record<string, string> = {};

        for (const row of rows) {
            const firstCell = row[0]?.trim() || '';

            if (firstCell === SETTINGS_SECTION) {
                inSettings = true;
                continue;
            } else if (inSettings && firstCell.startsWith('[') && firstCell.endsWith(']')) {
                break;
            }

            if (inSettings) {
                if (headers.length === 0) {
                    headers = row.map(h => h?.trim() || '');
                    continue;
                }
                // Parse settings row
                headers.forEach((h, idx) => {
                    if (h && row[idx]) {
                        settings[h] = row[idx];
                    }
                });
                break; // Only one settings row
            }
        }

        return NextResponse.json({
            data: {
                salaryDay: parseInt(settings['salary_day']) || 30,
                notifications: settings['notifications']?.toLowerCase() === 'true',
            }
        });
    } catch (error) {
        console.error('Get settings error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get settings' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { salaryDay, notifications } = body;

        // Check if settings section exists
        const rowRange = await getSettingsRowRange();

        if (rowRange) {
            // Update existing settings
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_ESSENTIALS}!A${rowRange.dataRow}:B${rowRange.dataRow}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[salaryDay, notifications ? 'TRUE' : 'FALSE']]
                }
            });
        } else {
            // Settings section doesn't exist, append it at the end
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_ESSENTIALS}!A:A`,
            });
            const lastRow = (response.data.values?.length || 0) + 2;

            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_ESSENTIALS}!A${lastRow}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [
                        [SETTINGS_SECTION],
                        ['salary_day', 'notifications'],
                        [salaryDay, notifications ? 'TRUE' : 'FALSE'],
                    ]
                }
            });
        }

        return NextResponse.json({
            success: true,
            data: { salaryDay, notifications }
        });
    } catch (error) {
        console.error('Save settings error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to save settings' },
            { status: 500 }
        );
    }
}
