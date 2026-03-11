import TextRecognition, { 
  TextRecognitionResult,
  TextBlock 
} from '@react-native-ml-kit/text-recognition';

export interface ScanResult {
  amount: number | null;
  merchantName: string | null;
  rawText: string;
}

const SKIP_WORDS = new Set([
  'paid', 'invoice', 'tax invoice', 'receipt', 'bill',
  'original', 'duplicate', 'copy', 'gst invoice',
  'retail invoice', 'cash memo', 'thank you', 'welcome',
  'fssai', 'gstin', 'gst#', 'gstin:'
]);

function sortBlocksByPosition(blocks: TextBlock[]): TextBlock[] {
  return [...blocks].sort((a, b) => {
    const aTop = a.frame?.top ?? 0;
    const bTop = b.frame?.top ?? 0;
    const threshold = 10;
    if (Math.abs(aTop - bTop) < threshold) {
      return (a.frame?.left ?? 0) - (b.frame?.left ?? 0);
    }
    return aTop - bTop;
  });
}

function filterByConfidence(blocks: TextBlock[], minConfidence = 0.6): TextBlock[] {
  return blocks.filter(block => {
    if (!block.lines || block.lines.length === 0) return true;
    const avgConfidence =
      block.lines.reduce((sum: number, line: { elements: any[]; }) => {
        const lineConf =
          line.elements?.reduce((s: any, el: { confidence: any; }) => s + (el.confidence ?? 1), 0) /
          (line.elements?.length || 1);
        return sum + (lineConf ?? 1);
      }, 0) / block.lines.length;
    return avgConfidence >= minConfidence;
  });
}

export async function scanReceipt(imageUri: string): Promise<ScanResult> {
  try {
    const result: TextRecognitionResult = await TextRecognition.recognize(imageUri);

    const sorted = sortBlocksByPosition(result.blocks);
    const highConfBlocks = filterByConfidence(sorted, 0.6);
    const rawText = sorted.map(b => b.text).join('\n');
    const extractionText = highConfBlocks.map(b => b.text).join('\n');

    const amount = extractAmount(extractionText);
    const merchantName = extractMerchantName(highConfBlocks);

    return { amount, merchantName, rawText };
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
}

function extractAmount(text: string): number | null {
  const lines = text.split('\n');

  const labelPatterns = [
    /grand\s*total/i,
    /bill\s*total\s*value/i,
    /net\s*payable/i,
    /amount\s*payable/i,
    /total\s*amount/i,
    /gross(?!\s*%)/i,
    /^total$/i,
  ];

  for (const pattern of labelPatterns) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        const sameLine = extractNumberFromLine(lines[i]);
        if (sameLine !== null) return sameLine;

        if (i + 1 < lines.length) {
          const nextLine = extractNumberFromLine(lines[i + 1]);
          if (nextLine !== null) return nextLine;
        }
      }
    }
  }

  // Fallback: largest ₹-prefixed amount on the receipt
  const rupeeRegex = /[₹Rs\.]\s*([\d,]+(?:\.\d{1,2})?)/g;
  const amounts: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = rupeeRegex.exec(text)) !== null) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) amounts.push(val);
  }

  return amounts.length > 0 ? Math.max(...amounts) : null;
}

function extractNumberFromLine(line: string): number | null {
  const match = line.match(/[₹Rs\.]?\s*([\d,]+(?:\.\d{1,2})?)[\s]*$/);
  if (match) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(val) ? null : val;
  }
  return null;
}

function extractMerchantName(blocks: TextBlock[]): string | null {
  for (const block of blocks) {
    const lines = block.text
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string | any[]) => l.length > 3);

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (SKIP_WORDS.has(lower)) continue;
      if ([...SKIP_WORDS].some(w => lower.startsWith(w))) continue;

      // Skip address lines
      if (/\d/.test(line) && /road|street|nagar|layout|cross|main|stage|phase/i.test(line)) continue;

      // Skip metadata lines
      if (/^(gstin|gst#|fssai|phone|tel|mob|date|time|bill no|invoice)/i.test(line)) continue;

      // Skip purely numeric lines
      if (/^\d+$/.test(line)) continue;

      return line;
    }
  }
  return null;
}