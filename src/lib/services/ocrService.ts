import Tesseract from 'tesseract.js';

export interface ParsedReceiptData {
    amount: number | null;
    description: string;
    date: string | null;
    rawText: string;
    items: { name: string; price: number }[];
}

/**
 * Scan receipt image using Tesseract.js OCR
 */
export async function scanReceipt(
    imageFile: File | Blob,
    onProgress?: (progress: number) => void
): Promise<string> {
    const result = await Tesseract.recognize(imageFile, 'ind+eng', {
        logger: (m) => {
            if (m.status === 'recognizing text' && onProgress) {
                onProgress(Math.round(m.progress * 100));
            }
        },
    });

    return result.data.text;
}

/**
 * Parse OCR text to extract structured receipt data
 */
export function parseReceiptData(text: string): ParsedReceiptData {
    const lines = text.split('\n').filter((line) => line.trim().length > 0);

    let amount: number | null = null;
    let description = '';
    let date: string | null = null;
    const items: { name: string; price: number }[] = [];

    // Patterns for Indonesian receipts
    const amountPatterns = [
        /total\s*[:=]?\s*Rp\.?\s*([\d.,]+)/i,
        /grand\s*total\s*[:=]?\s*Rp\.?\s*([\d.,]+)/i,
        /jumlah\s*[:=]?\s*Rp\.?\s*([\d.,]+)/i,
        /bayar\s*[:=]?\s*Rp\.?\s*([\d.,]+)/i,
        /tunai\s*[:=]?\s*Rp\.?\s*([\d.,]+)/i,
        /Rp\.?\s*([\d.,]+)\s*$/m, // Rp at end of line
        /([\d]{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?)\s*$/m, // Large numbers at end
    ];

    const datePatterns = [
        /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
        /(\d{1,2}\s+(?:jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)[a-z]*\s+\d{2,4})/i,
        /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
    ];

    // Parse each line
    for (const line of lines) {
        const cleanLine = line.trim();

        // Try to find date
        if (!date) {
            for (const pattern of datePatterns) {
                const match = cleanLine.match(pattern);
                if (match) {
                    date = match[1];
                    break;
                }
            }
        }

        // Try to find total amount
        if (!amount) {
            for (const pattern of amountPatterns) {
                const match = cleanLine.match(pattern);
                if (match) {
                    const amountStr = match[1].replace(/[.,]/g, (m, offset, str) => {
                        // Keep last separator as decimal if followed by 2 digits
                        const remaining = str.slice(offset + 1);
                        if (remaining.length === 2 && /^\d{2}$/.test(remaining)) {
                            return '.';
                        }
                        return '';
                    });
                    const parsed = parseFloat(amountStr);
                    if (!isNaN(parsed) && parsed > 0) {
                        amount = parsed;
                        break;
                    }
                }
            }
        }

        // Try to find item with price
        const itemMatch = cleanLine.match(/^(.+?)\s+(?:Rp\.?\s*)?([\d.,]+)$/);
        if (itemMatch) {
            const itemName = itemMatch[1].trim();
            const priceStr = itemMatch[2].replace(/[.,]/g, '');
            const price = parseInt(priceStr, 10);
            if (itemName.length > 2 && price > 0 && price < 100000000) {
                items.push({ name: itemName, price });
            }
        }
    }

    // Generate description from items or first meaningful line
    if (items.length > 0) {
        description = items.slice(0, 3).map(i => i.name).join(', ');
        if (items.length > 3) {
            description += `, +${items.length - 3} lainnya`;
        }
    } else {
        // Find first line that looks like a store name
        const storeLine = lines.find(line =>
            line.length > 3 &&
            line.length < 50 &&
            !/^\d+$/.test(line.trim()) &&
            !/total|jumlah|bayar/i.test(line)
        );
        description = storeLine?.trim() || 'Scan Receipt';
    }

    return {
        amount,
        description,
        date,
        rawText: text,
        items,
    };
}

/**
 * Format parsed date to YYYY-MM-DD
 */
export function formatParsedDate(dateStr: string | null): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    // Try to parse various date formats
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }

    // Try DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
    if (dmyMatch) {
        const day = dmyMatch[1].padStart(2, '0');
        const month = dmyMatch[2].padStart(2, '0');
        let year = dmyMatch[3];
        if (year.length === 2) {
            year = '20' + year;
        }
        return `${year}-${month}-${day}`;
    }

    return new Date().toISOString().split('T')[0];
}
