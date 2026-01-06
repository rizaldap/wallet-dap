import { NextResponse } from 'next/server';
import { sheets, SPREADSHEET_ID, getTransactionSheetName, SHEET_ESSENTIALS } from '@/lib/sheets/client';

export async function POST() {
    try {
        const currentYear = new Date().getFullYear();
        const currentSheetName = getTransactionSheetName(currentYear);

        // Get spreadsheet info
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const existingSheets = spreadsheet.data.sheets || [];
        const currentSheet = existingSheets.find(s => s.properties?.title === currentSheetName);

        if (!currentSheet) {
            return NextResponse.json({
                success: false,
                message: 'No transaction sheet found for current year'
            }, { status: 404 });
        }

        const sheetId = currentSheet.properties?.sheetId;
        const deletedName = `DELETED_${currentSheetName}_${Date.now()}`;

        // Rename old sheet to DELETED_*
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [{
                    updateSheetProperties: {
                        properties: {
                            sheetId,
                            title: deletedName,
                        },
                        fields: 'title',
                    }
                }]
            }
        });

        // Create new transaction sheet
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [{
                    addSheet: {
                        properties: {
                            title: currentSheetName,
                        }
                    }
                }]
            }
        });

        // Add headers to new sheet
        const transactionHeaders = [
            ['id', 'date', 'amount', 'type', 'wallet_id', 'wallet_name', 'category_id', 'category_name', 'credit_card_id', 'description', 'notes', 'is_installment', 'installment_total', 'installment_current', 'created_at']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${currentSheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: transactionHeaders
            }
        });

        return NextResponse.json({
            success: true,
            message: `Transactions deleted. Old data backed up to "${deletedName}". New sheet "${currentSheetName}" created.`,
            deletedSheet: deletedName,
            newSheet: currentSheetName,
        });
    } catch (error) {
        console.error('Delete transactions error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete transactions' },
            { status: 500 }
        );
    }
}
