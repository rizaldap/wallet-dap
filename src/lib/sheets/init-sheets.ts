import { sheets, SPREADSHEET_ID, SHEET_ESSENTIALS, SECTIONS, getTransactionSheetName } from './client';

/**
 * Initialize the spreadsheet with required sheets and headers
 * Run this script once after creating a new spreadsheet
 */
export async function initializeSpreadsheet() {
    console.log('🚀 Initializing spreadsheet...');

    // Get existing sheets
    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
    });

    const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
    const currentYear = new Date().getFullYear();
    const transactionSheet = getTransactionSheetName(currentYear);

    // Create sheets if they don't exist
    const sheetsToCreate = [SHEET_ESSENTIALS, transactionSheet].filter(
        name => !existingSheets.includes(name)
    );

    if (sheetsToCreate.length > 0) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: sheetsToCreate.map(title => ({
                    addSheet: { properties: { title } }
                }))
            }
        });
        console.log(`✅ Created sheets: ${sheetsToCreate.join(', ')}`);
    }

    // Initialize Essentials sheet with sections
    console.log('📋 Setting up Essentials sheet...');

    const essentialsData = [
        // WALLETS Section
        [SECTIONS.WALLETS],
        ['id', 'name', 'type', 'icon', 'color', 'initial_balance', 'balance', 'is_active'],
        ['w001', 'BCA', 'bank', '🏦', '#0066AE', '0', '0', 'TRUE'],
        ['w002', 'GoPay', 'e-wallet', '💳', '#00AED8', '0', '0', 'TRUE'],
        ['w003', 'Cash', 'cash', '💵', '#4CAF50', '0', '0', 'TRUE'],
        [''],

        // WALLET_TYPES Section
        [SECTIONS.WALLET_TYPES],
        ['type_id', 'type_name', 'icon'],
        ['bank', 'Bank', '🏦'],
        ['e-wallet', 'E-Wallet', '💳'],
        ['cash', 'Cash', '💵'],
        ['investment', 'Investment', '📈'],
        [''],

        // CREDIT_CARDS Section
        [SECTIONS.CREDIT_CARDS],
        ['id', 'name', 'credit_limit', 'current_balance', 'billing_date', 'due_date', 'color', 'is_active'],
        [''],

        // CATEGORIES Income Section
        [SECTIONS.CATEGORIES_INCOME],
        ['id', 'name', 'icon', 'color', 'type', 'budget_monthly'],
        ['cat001', 'Salary', '💰', '#4CAF50', 'income', ''],
        ['cat002', 'Freelance', '💻', '#2196F3', 'income', ''],
        ['cat003', 'Investment Return', '📈', '#9C27B0', 'income', ''],
        ['cat004', 'Bonus', '🎁', '#FF9800', 'income', ''],
        [''],

        // CATEGORIES Expense Section
        [SECTIONS.CATEGORIES_EXPENSE],
        ['id', 'name', 'icon', 'color', 'type', 'budget_monthly'],
        ['cat101', 'Food & Drinks', '🍔', '#FF5722', 'expense', '2000000'],
        ['cat102', 'Transport', '🚗', '#3F51B5', 'expense', '1500000'],
        ['cat103', 'Shopping', '🛒', '#E91E63', 'expense', '1000000'],
        ['cat104', 'Bills & Utilities', '📄', '#607D8B', 'expense', '3000000'],
        ['cat105', 'Entertainment', '🎬', '#9C27B0', 'expense', '500000'],
        ['cat106', 'Health', '🏥', '#F44336', 'expense', '500000'],
        ['cat107', 'Education', '📚', '#00BCD4', 'expense', '1000000'],
        [''],

        // TRANSACTION_TYPES Section
        [SECTIONS.TRANSACTION_TYPES],
        ['type_id', 'type_name', 'description'],
        ['income', 'Income', 'Pemasukan ke wallet'],
        ['expense', 'Expense', 'Pengeluaran dari wallet'],
        ['transfer', 'Transfer', 'Pindah antar wallet'],
        ['credit_expense', 'Credit Expense', 'Pengeluaran via kartu kredit'],
        ['credit_payment', 'Credit Payment', 'Bayar tagihan kartu kredit'],
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_ESSENTIALS}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: essentialsData
        }
    });

    // Initialize Transaction sheet headers
    console.log('📊 Setting up transaction sheet...');

    const transactionHeaders = [
        ['id', 'date', 'amount', 'type', 'wallet_id', 'wallet_name', 'category_id', 'category_name', 'credit_card_id', 'description', 'notes', 'is_installment', 'installment_total', 'installment_current', 'created_at']
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${transactionSheet}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: transactionHeaders
        }
    });

    console.log('✅ Spreadsheet initialized successfully!');
    console.log(`📌 Essentials sheet: ${SHEET_ESSENTIALS}`);
    console.log(`📌 Transaction sheet: ${transactionSheet}`);
}

// Export for API route usage
export default initializeSpreadsheet;
