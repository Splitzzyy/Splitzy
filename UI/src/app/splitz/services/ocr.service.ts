import { Injectable } from '@angular/core';
import { createWorker } from 'tesseract.js';

@Injectable({
    providedIn: 'root'
})
export class OcrService {

    constructor() { }

    async recognizeImage(image: File | string): Promise<{ amount: number | null, date: Date | null, merchantName: string | null, text: string }> {
        const worker = await createWorker('eng');

        try {
            const ret = await worker.recognize(image);
            const text = ret.data.text;

            const amount = this.extractAmount(text);
            const date = this.extractDate(text);
            const merchantName = this.extractMerchantName(text);

            return { amount, date, merchantName, text };
        } catch (error) {
            console.error('OCR Error:', error);
            throw error;
        } finally {
            await worker.terminate();
        }
    }

    private extractAmount(text: string): number | null {
        // Look for lines with "Total", "Amount", "Balance" followed by numbers
        // Regex matches currency symbols optionally, and standard number formats
        const amountRegex = /(?:total|amount|grand total|balance|due)[\s:.]*([$₹]?)[\s]*(\d+[.,]\d{2})/i;
        const match = text.match(amountRegex);

        if (match && match[2]) {
            // Replace comma with dot if comma is used as decimal separator (common in some regions, though receipt usually use dot)
            // Actually standardizing to float: remove non-numeric except dot
            const cleanAmount = match[2].replace(/,/g, '');
            return parseFloat(cleanAmount);
        }

        // Fallback: look for the largest number that looks like a price? (Risky)
        // For now, let's stick to explicit total labels to avoid picking up phone numbers or IDs
        return null;
    }

    private extractDate(text: string): Date | null {
        // Matches DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
        const dateRegex = /(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})|(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/;
        const match = text.match(dateRegex);

        if (match && match[0]) {
            const dateStr = match[0];
            const timestamp = Date.parse(dateStr);
            if (!isNaN(timestamp)) {
                return new Date(timestamp);
            }
        }
        return null;
    }

    private extractMerchantName(text: string): string | null {
        // Simple heuristic: The first non-empty line is often the merchant name.
        // We filter out very short lines or lines that might be "Tax Invoice" headers if possible.
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);

        if (lines.length > 0) {
            // Check if first line is generic header like "Tax Invoice" or "Receipt"
            // If so, maybe take the second line?
            // For "SHOPPERS' CITY", it should be the first line.
            return lines[0];
        }
        return null;
    }
}
