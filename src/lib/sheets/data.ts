import { sheets, SPREADSHEET_ID, SHEET_ESSENTIALS, SECTIONS, getTransactionSheetName } from './client';
import type { Wallet, CreditCard, Category, Transaction, WalletType, TransactionType } from '@/types';

// ============ HELPER FUNCTIONS ============

// Generate unique ID
const generateId = (prefix: string): string => {
    return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;
};

// Parse section data from Essentials sheet
async function parseSectionData<T>(
    sectionMarker: string,
    mapper: (row: string[], headers: string[]) => T
): Promise<T[]> {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_ESSENTIALS}!A:Z`,
    });

    const rows = response.data.values || [];
    const results: T[] = [];
    let inSection = false;
    let headers: string[] = [];

    for (const row of rows) {
        const firstCell = row[0]?.trim() || '';

        // Check if we hit a section marker (format: [SECTION_NAME])
        if (firstCell.startsWith('[') && firstCell.endsWith(']')) {
            if (firstCell === sectionMarker) {
                inSection = true;
                continue;
            } else if (inSection) {
                // We've left our section
                break;
            }
            continue;
        }

        if (inSection) {
            // First row after section marker is headers
            if (headers.length === 0) {
                headers = row.map(h => h?.trim() || '');
                continue;
            }

            // Skip empty rows
            if (!row[0]?.trim()) continue;

            try {
                results.push(mapper(row, headers));
            } catch (e) {
                console.error('Error parsing row:', row, e);
            }
        }
    }

    return results;
}

// Find section row range in Essentials sheet
async function findSectionRange(sectionMarker: string): Promise<{ startRow: number; headerRow: number; dataStartRow: number; dataEndRow: number }> {
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_ESSENTIALS}!A:A`,
    });

    const rows = response.data.values || [];
    let startRow = -1;
    let headerRow = -1;
    let dataStartRow = -1;
    let dataEndRow = -1;

    for (let i = 0; i < rows.length; i++) {
        const cell = rows[i][0]?.trim() || '';

        if (cell === sectionMarker) {
            startRow = i + 1; // 1-indexed
            headerRow = i + 2;
            dataStartRow = i + 3;
        } else if (startRow > 0 && cell.startsWith('[') && cell.endsWith(']')) {
            dataEndRow = i; // End before next section
            break;
        } else if (startRow > 0 && !cell && dataEndRow === -1) {
            // Empty row could be end of data
            dataEndRow = i + 1;
        }
    }

    // If no next section found, estimate end
    if (dataEndRow === -1) {
        dataEndRow = rows.length + 1;
    }

    return { startRow, headerRow, dataStartRow, dataEndRow };
}

// ============ WALLETS ============

export async function getWallets(): Promise<Wallet[]> {
    return parseSectionData<Wallet>(SECTIONS.WALLETS, (row, headers) => {
        const getValue = (key: string) => row[headers.indexOf(key)] || '';
        return {
            id: getValue('id'),
            userId: 'default', // Single user for sheets
            name: getValue('name'),
            type: getValue('type') as WalletType,
            icon: getValue('icon'),
            color: getValue('color'),
            initialBalance: parseFloat(getValue('initial_balance')) || 0,
            balance: parseFloat(getValue('balance')) || 0,
            isActive: getValue('is_active')?.toLowerCase() === 'true',
        };
    });
}

export async function createWallet(wallet: Omit<Wallet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Wallet> {
    const id = generateId('w');
    const { dataEndRow } = await findSectionRange(SECTIONS.WALLETS);

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_ESSENTIALS}!A${dataEndRow}`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values: [[
                id,
                wallet.name,
                wallet.type,
                wallet.icon,
                wallet.color,
                wallet.initialBalance,
                wallet.balance,
                'TRUE'
            ]]
        }
    });

    return { ...wallet, id };
}

export async function updateWallet(id: string, updates: Partial<Wallet>): Promise<Wallet> {
    const wallets = await getWallets();
    const walletIndex = wallets.findIndex(w => w.id === id);
    if (walletIndex === -1) throw new Error('Wallet not found');

    const { dataStartRow } = await findSectionRange(SECTIONS.WALLETS);
    const rowNum = dataStartRow + walletIndex;

    const updated = { ...wallets[walletIndex], ...updates };

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_ESSENTIALS}!A${rowNum}:H${rowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[
                updated.id,
                updated.name,
                updated.type,
                updated.icon,
                updated.color,
                updated.initialBalance,
                updated.balance,
                updated.isActive ? 'TRUE' : 'FALSE'
            ]]
        }
    });

    return updated;
}

export async function deleteWallet(id: string): Promise<void> {
    const wallets = await getWallets();
    const walletIndex = wallets.findIndex(w => w.id === id);
    if (walletIndex === -1) throw new Error('Wallet not found');

    const { dataStartRow } = await findSectionRange(SECTIONS.WALLETS);
    const rowNum = dataStartRow + walletIndex;

    // Get sheet ID
    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
    });
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === SHEET_ESSENTIALS)?.properties?.sheetId;

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId,
                        dimension: 'ROWS',
                        startIndex: rowNum - 1,
                        endIndex: rowNum,
                    }
                }
            }]
        }
    });
}

// ============ CREDIT CARDS ============

export async function getCreditCards(): Promise<CreditCard[]> {
    return parseSectionData<CreditCard>(SECTIONS.CREDIT_CARDS, (row, headers) => {
        const getValue = (key: string) => row[headers.indexOf(key)] || '';
        return {
            id: getValue('id'),
            userId: 'default',
            name: getValue('name'),
            limit: parseFloat(getValue('credit_limit')) || 0,
            currentBalance: parseFloat(getValue('current_balance')) || 0,
            billingDate: parseInt(getValue('billing_date')) || 1,
            dueDate: parseInt(getValue('due_date')) || 15,
            color: getValue('color'),
            isActive: getValue('is_active')?.toLowerCase() === 'true',
        };
    });
}

export async function createCreditCard(card: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditCard> {
    const id = generateId('cc');
    const { dataEndRow } = await findSectionRange(SECTIONS.CREDIT_CARDS);

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_ESSENTIALS}!A${dataEndRow}`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values: [[
                id,
                card.name,
                card.limit,
                card.currentBalance,
                card.billingDate,
                card.dueDate,
                card.color,
                'TRUE'
            ]]
        }
    });

    return { ...card, id };
}

export async function updateCreditCard(id: string, updates: Partial<CreditCard>): Promise<CreditCard> {
    const cards = await getCreditCards();
    const cardIndex = cards.findIndex(c => c.id === id);
    if (cardIndex === -1) throw new Error('Credit card not found');

    const { dataStartRow } = await findSectionRange(SECTIONS.CREDIT_CARDS);
    const rowNum = dataStartRow + cardIndex;

    const updated = { ...cards[cardIndex], ...updates };

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_ESSENTIALS}!A${rowNum}:H${rowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[
                updated.id,
                updated.name,
                updated.limit,
                updated.currentBalance,
                updated.billingDate,
                updated.dueDate,
                updated.color,
                updated.isActive ? 'TRUE' : 'FALSE'
            ]]
        }
    });

    return updated;
}

export async function deleteCreditCard(id: string): Promise<void> {
    const cards = await getCreditCards();
    const cardIndex = cards.findIndex(c => c.id === id);
    if (cardIndex === -1) throw new Error('Credit card not found');

    const { dataStartRow } = await findSectionRange(SECTIONS.CREDIT_CARDS);
    const rowNum = dataStartRow + cardIndex;

    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
    });
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === SHEET_ESSENTIALS)?.properties?.sheetId;

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId,
                        dimension: 'ROWS',
                        startIndex: rowNum - 1,
                        endIndex: rowNum,
                    }
                }
            }]
        }
    });
}

// ============ CATEGORIES ============

export async function getCategories(): Promise<Category[]> {
    const incomeCategories = await parseSectionData<Category>(SECTIONS.CATEGORIES_INCOME, (row, headers) => {
        const getValue = (key: string) => row[headers.indexOf(key)] || '';
        return {
            id: getValue('id'),
            userId: 'default',
            name: getValue('name'),
            icon: getValue('icon'),
            color: getValue('color'),
            type: 'income' as const,
            budgetMonthly: parseFloat(getValue('budget_monthly')) || null,
        };
    });

    const expenseCategories = await parseSectionData<Category>(SECTIONS.CATEGORIES_EXPENSE, (row, headers) => {
        const getValue = (key: string) => row[headers.indexOf(key)] || '';
        return {
            id: getValue('id'),
            userId: 'default',
            name: getValue('name'),
            icon: getValue('icon'),
            color: getValue('color'),
            type: 'expense' as const,
            budgetMonthly: parseFloat(getValue('budget_monthly')) || null,
        };
    });

    return [...incomeCategories, ...expenseCategories];
}

export async function createCategory(category: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    const id = generateId('cat');
    const sectionMarker = category.type === 'income' ? SECTIONS.CATEGORIES_INCOME : SECTIONS.CATEGORIES_EXPENSE;
    const { dataEndRow } = await findSectionRange(sectionMarker);

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_ESSENTIALS}!A${dataEndRow}`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values: [[
                id,
                category.name,
                category.icon,
                category.color,
                category.type,
                category.budgetMonthly || ''
            ]]
        }
    });

    return { ...category, id };
}

// ============ TRANSACTIONS ============

export async function getTransactions(limit?: number): Promise<Transaction[]> {
    const year = new Date().getFullYear();
    const sheetName = getTransactionSheetName(year);

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A:O`,
        });

        const rows = response.data.values || [];
        if (rows.length <= 1) return []; // Only headers or empty

        const headers = rows[0].map(h => h?.trim() || '');
        const dataRows = rows.slice(1);

        const transactions = dataRows
            .filter(row => row[0]?.trim()) // Skip empty rows
            .map(row => {
                const getValue = (key: string) => row[headers.indexOf(key)] || '';
                return {
                    id: getValue('id'),
                    userId: 'default',
                    date: getValue('date'),
                    amount: parseFloat(getValue('amount')) || 0,
                    type: getValue('type') as TransactionType,
                    walletId: getValue('wallet_id') || null,
                    categoryId: getValue('category_id') || null,
                    creditCardId: getValue('credit_card_id') || null,
                    fromWalletId: null,
                    toWalletId: null,
                    description: getValue('description'),
                    notes: getValue('notes') || null,
                    isInstallment: getValue('is_installment')?.toLowerCase() === 'true',
                    installmentTotal: parseInt(getValue('installment_total')) || null,
                    installmentCurrent: parseInt(getValue('installment_current')) || null,
                    createdAt: getValue('created_at'),
                } as Transaction;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return limit ? transactions.slice(0, limit) : transactions;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

export async function getTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
    const sheetName = getTransactionSheetName(year);
    const transactions = await getTransactions();

    return transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate.getFullYear() === year && txDate.getMonth() + 1 === month;
    });
}

export async function createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const id = generateId('t');
    const year = new Date(transaction.date).getFullYear();
    const sheetName = getTransactionSheetName(year);
    const createdAt = new Date().toISOString();

    // Get wallet and category names for easier reading in spreadsheet
    const wallets = await getWallets();
    const categories = await getCategories();
    const wallet = wallets.find(w => w.id === transaction.walletId);
    const category = categories.find(c => c.id === transaction.categoryId);

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A:O`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values: [[
                id,
                transaction.date,
                transaction.amount,
                transaction.type,
                transaction.walletId || '',
                wallet?.name || '',
                transaction.categoryId || '',
                category?.name || '',
                transaction.creditCardId || '',
                transaction.description,
                transaction.notes || '',
                transaction.isInstallment ? 'TRUE' : 'FALSE',
                transaction.installmentTotal || '',
                transaction.installmentCurrent || '',
                createdAt
            ]]
        }
    });

    // Update wallet balance
    if (transaction.walletId && wallet) {
        const balanceChange = transaction.type === 'income' ? transaction.amount : -transaction.amount;
        await updateWallet(transaction.walletId, { balance: wallet.balance + balanceChange });
    }

    return { ...transaction, id, createdAt } as Transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
    const transactions = await getTransactions();
    const tx = transactions.find(t => t.id === id);
    if (!tx) throw new Error('Transaction not found');

    const year = new Date(tx.date).getFullYear();
    const sheetName = getTransactionSheetName(year);

    // Find the row
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A:A`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) throw new Error('Transaction row not found');

    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
    });
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName)?.properties?.sheetId;

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId,
                        dimension: 'ROWS',
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1,
                    }
                }
            }]
        }
    });

    // Restore wallet balance
    if (tx.walletId) {
        const wallets = await getWallets();
        const wallet = wallets.find(w => w.id === tx.walletId);
        if (wallet) {
            const balanceChange = tx.type === 'income' ? -tx.amount : tx.amount;
            await updateWallet(tx.walletId, { balance: wallet.balance + balanceChange });
        }
    }
}

// ============ SUMMARY ============

export async function getMonthlySummary(year: number, month: number) {
    const transactions = await getTransactionsByMonth(year, month);

    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === 'expense' || t.type === 'credit_expense')
        .reduce((sum, t) => sum + t.amount, 0);

    return { income, expense, net: income - expense };
}

export async function getCategorySummary(year: number, month: number) {
    const transactions = await getTransactionsByMonth(year, month);
    const categories = await getCategories();

    const categoryMap = new Map<string, { name: string; icon: string; total: number }>();

    for (const tx of transactions.filter(t => t.type === 'expense')) {
        const category = categories.find(c => c.id === tx.categoryId);
        if (category) {
            const existing = categoryMap.get(category.id) || { name: category.name, icon: category.icon, total: 0 };
            existing.total += tx.amount;
            categoryMap.set(category.id, existing);
        }
    }

    return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
}
