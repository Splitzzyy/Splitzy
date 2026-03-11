import TextRecognition from '@react-native-ml-kit/text-recognition';

export interface ScanResult {
  amount: number | null;
  merchantName: string | null;
  rawText: string;
}

export async function scanReceipt(imageUri: string): Promise<ScanResult> {
  try {
    const result = await TextRecognition.recognize(imageUri);
    
    // Join all text blocks to simulate tesseract's full text output
    // so we can use the same extraction logic as the web app
    const text = result.blocks.map(block => block.text).join('\n');

    const amount = extractAmount(text);
    const merchantName = extractMerchantName(text);

    return { amount, merchantName, rawText: text };
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
}

function extractAmount(text: string): number | null {
  // Same regex as web app: Look for lines with "Total", "Amount", "Balance" followed by numbers
  const amountRegex = /(?:total|amount|grand total|balance|due)[\s:.]*([$₹]?)[\s]*(\d+[.,]\d{2})/i;
  const match = text.match(amountRegex);

  if (match && match[2]) {
    // Remove comma if used as thousand separator (common on receipts)
    const cleanAmount = match[2].replace(/,/g, '');
    return parseFloat(cleanAmount);
  }

  return null;
}

function extractMerchantName(text: string): string | null {
  // Simple heuristic from web app: The first non-empty line > 3 chars is often the merchant name
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);

  if (lines.length > 0) {
    return lines[0];
  }
  return null;
}
