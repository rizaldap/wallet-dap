import { google } from 'googleapis';

// Initialize Google Sheets client with service account
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export const sheets = google.sheets({ version: 'v4', auth });
export const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '';

// Sheet names
export const SHEET_ESSENTIALS = 'Essentials';

// Get current year sheet name for transactions
export const getTransactionSheetName = (year?: number): string => {
    return String(year || new Date().getFullYear());
};

// Section markers in Essentials sheet
// Using [SECTION] format instead of === to avoid Google Sheets formula interpretation
export const SECTIONS = {
    WALLETS: '[WALLETS]',
    WALLET_TYPES: '[WALLET_TYPES]',
    CREDIT_CARDS: '[CREDIT_CARDS]',
    CATEGORIES_INCOME: '[CATEGORIES_INCOME]',
    CATEGORIES_EXPENSE: '[CATEGORIES_EXPENSE]',
    TRANSACTION_TYPES: '[TRANSACTION_TYPES]',
} as const;
