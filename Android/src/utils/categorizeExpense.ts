import { ExpenseCategory } from '@/constants/categories';

// Keyword lists for each expense category (ported from web version)
const categoryKeywords: Record<ExpenseCategory, string[]> = {
  // Uncategorized - no keywords
  [ExpenseCategory.Uncategorized]: [],

  // Food & Dining
  [ExpenseCategory.Food]: [
    'dinner', 'lunch', 'breakfast', 'brunch', 'supper', 'meal', 'eating',
    'food', 'snack', 'tiffin', 'dabba', 'restaurant', 'cafe', 'cafeteria',
    'dhaba', 'canteen', 'eatery', 'swiggy', 'zomato', 'blinkit', 'zepto',
    'coffee', 'tea', 'chai', 'juice', 'smoothie', 'milkshake', 'lassi',
    'buttermilk', 'pizza', 'burger', 'sandwich', 'wrap', 'roll', 'noodles',
    'pasta', 'momos', 'pav bhaji', 'vada pav', 'biryani', 'curry', 'dal',
    'sabzi', 'roti', 'paratha', 'idli', 'dosa', 'poha', 'upma', 'thali',
    'paneer', 'groceries', 'grocery', 'supermarket', 'vegetables', 'fruits',
    'ration', 'provision', 'kirana', 'bakery', 'cake', 'pastry', 'sweets',
    'mithai', 'chocolate', 'ice cream', 'dessert', 'takeout', 'takeaway',
    'delivery', 'order food', 'cooking gas', 'packaged food',
  ],

  // Travel & Trips
  [ExpenseCategory.Travel]: [
    'flight', 'airline', 'airways', 'airport', 'indigo', 'air india',
    'spicejet', 'vistara', 'hotel', 'airbnb', 'resort', 'hostel', 'oyo',
    'makemytrip', 'goibibo', 'yatra', 'lodge', 'guesthouse', 'vacation',
    'trip', 'holiday', 'tour', 'travel', 'journey', 'itinerary',
    'sightseeing', 'excursion', 'pilgrimage', 'visa', 'passport',
    'travel insurance', 'booking', 'reservation', 'ticket', 'cleartrip',
    'luggage', 'backpack', 'roaming', 'forex', 'currency exchange',
    'travel kit',
  ],

  // Utilities & Bills
  [ExpenseCategory.Utilities]: [
    'electricity', 'water', 'gas', 'lpg', 'pipeline gas', 'utility', 'bill',
    'internet', 'wifi', 'broadband', 'jio', 'airtel', 'bsnl', 'vi',
    'vodafone', 'idea', 'recharge', 'mobile bill', 'phone bill', 'postpaid',
    'prepaid', 'data plan', 'talktime', 'dth', 'tata sky', 'dish tv',
    'cable tv', 'landline', 'piped water', 'sewage', 'property tax',
    'society charges', 'maintenance charges', 'generator', 'inverter battery',
  ],

  // Entertainment
  [ExpenseCategory.Entertainment]: [
    'netflix', 'prime video', 'hotstar', 'disney', 'sony liv', 'zee5',
    'jiocinema', 'mxplayer', 'youtube premium', 'apple tv', 'voot', 'aha',
    'spotify', 'gaana', 'wynk', 'jiosaavn', 'apple music', 'concert',
    'live music', 'movie', 'cinema', 'bookmyshow', 'theatre', 'multiplex',
    'pvr', 'inox', 'film', 'game', 'gaming', 'playstation', 'xbox', 'steam',
    'pubg', 'battleground', 'esports', 'subscription', 'streaming',
    'amusement', 'park', 'event', 'show', 'standup', 'comedy', 'circus',
    'carnival',
  ],

  // Housing & Rent
  [ExpenseCategory.Housing]: [
    'rent', 'mortgage', 'emi', 'lease', 'security deposit', 'advance rent',
    'pgrent', 'pg', 'apartment', 'flat', 'house', 'home', 'villa', 'plot',
    'studio', 'maintenance', 'repair', 'plumber', 'electrician', 'carpenter',
    'painter', 'renovation', 'construction', 'whitewash', 'flooring',
    'tiling', 'waterproofing', 'fridge', 'refrigerator', 'washing machine',
    'ac', 'air conditioner', 'microwave', 'gas stove', 'chimney', 'geyser',
    'water heater', 'fan', 'cooler', 'tv', 'furniture', 'sofa', 'bed',
    'mattress', 'wardrobe', 'curtains', 'interior', 'decor', 'cook', 'maid',
    'housekeeper', 'watchman', 'cleaning', 'pest control',
  ],

  // Healthcare & Medical
  [ExpenseCategory.Healthcare]: [
    'doctor', 'physician', 'specialist', 'clinic', 'hospital', 'dentist',
    'ophthalmologist', 'dermatologist', 'gynecologist', 'pediatrician',
    'consultation', 'checkup', 'medicine', 'tablet', 'capsule', 'syrup',
    'injection', 'prescription', 'pharmacy', 'medplus', 'apollo pharmacy',
    'netmeds', '1mg', 'pharmeasy', 'lab test', 'blood test', 'x-ray', 'mri',
    'scan', 'ecg', 'ultrasound', 'pathology', 'health insurance',
    'mediclaim', 'insurance', 'therapy', 'physiotherapy', 'mental health',
    'counselling', 'vaccination', 'medical', 'surgery', 'emergency',
    'glasses', 'spectacles', 'lenses', 'eye care', 'braces', 'dental',
    'root canal',
  ],

  // Shopping
  [ExpenseCategory.Shopping]: [
    'amazon', 'flipkart', 'meesho', 'myntra', 'ajio', 'nykaa', 'snapdeal',
    'tata cliq', 'reliance digital', 'clothing', 'clothes', 'shirt',
    'tshirt', 'jeans', 'trousers', 'dress', 'saree', 'kurta', 'ethnic wear',
    'formal wear', 'jacket', 'sweater', 'hoodie', 'leggings', 'shorts',
    'skirt', 'shoes', 'sandals', 'slippers', 'sneakers', 'heels', 'boots',
    'chappal', 'bag', 'purse', 'wallet', 'watch', 'sunglasses', 'jewellery',
    'belt', 'cap', 'hat', 'mall', 'store', 'showroom', 'boutique', 'market',
    'bazaar', 'purchase', 'order', 'delivery', 'mobile', 'phone', 'laptop',
    'tablet', 'earphones', 'headphones', 'charger', 'cable', 'accessories',
    'utensils', 'cookware', 'bedsheet', 'towel', 'household',
  ],

  // Transportation & Commute
  [ExpenseCategory.Transportation]: [
    'uber', 'ola', 'rapido', 'namma yatri', 'bluemart', 'indrive', 'taxi',
    'cab', 'auto', 'rickshaw', 'bus', 'metro', 'train', 'local train',
    'subway', 'bicycle', 'bike', 'scooter', 'bike taxi', 'two wheeler',
    'car', 'petrol', 'diesel', 'fuel', 'cng', 'ev charging',
    'vehicle service', 'car service', 'car wash', 'tyre', 'puncture',
    'oil change', 'car repair', 'parking', 'toll', 'fastag', 'commute',
    'pass', 'monthly pass', 'season ticket', 'irctc', 'redbus',
    'bus ticket', 'train ticket', 'flight ticket',
  ],

  // Education
  [ExpenseCategory.Education]: [
    'school', 'college', 'university', 'institute', 'coaching', 'tuition',
    'fee', 'fees', 'admission', 'exam fee', 'registration', 'annual fee',
    'semester fee', 'course', 'udemy', 'coursera', 'unacademy', 'byjus',
    'vedantu', 'upgrad', 'skillshare', 'linkedin learning', 'pluralsight',
    'edx', 'khan academy', 'book', 'books', 'stationery', 'notebook', 'pen',
    'pencil', 'geometry box', 'study material', 'certification', 'training',
    'workshop', 'bootcamp', 'seminar', 'webinar', 'class', 'exam', 'test',
    'neet', 'jee', 'upsc', 'gre', 'gmat', 'ielts', 'toefl', 'sat',
  ],

  // Personal Care & Wellness
  [ExpenseCategory.Personal]: [
    'haircut', 'hair color', 'barber', 'shave', 'salon', 'parlour', 'waxing',
    'threading', 'manicure', 'pedicure', 'facial', 'cleanup', 'skincare',
    'moisturizer', 'sunscreen', 'serum', 'face wash', 'makeup', 'cosmetics',
    'perfume', 'deodorant', 'beauty', 'nykaa', 'body lotion', 'gym',
    'fitness', 'yoga', 'zumba', 'crossfit', 'workout', 'sports', 'swimming',
    'cycling', 'running', 'marathon', 'spa', 'massage', 'meditation',
    'wellness', 'detox', 'ayurveda', 'membership', 'self-care',
    'grooming kit', 'razor', 'supplement', 'protein',
  ],

  // Other / Miscellaneous
  [ExpenseCategory.Other]: [
    'gift', 'present', 'gifting', 'birthday gift', 'anniversary gift',
    'wedding gift', 'donation', 'charity', 'ngo', 'temple', 'church',
    'mosque', 'offering', 'prasad', 'loan', 'emi payment', 'credit card',
    'fine', 'penalty', 'late fee', 'bank charge', 'notary', 'stamp duty',
    'registration', 'legal fee', 'advocate', 'miscellaneous', 'other',
    'misc', 'random', 'unknown', 'general', 'expense',
  ],
};

/**
 * Categorizes an expense description by matching keywords against known categories.
 * Returns the first matching category, or Uncategorized if no match is found.
 */
export function categorizeExpense(description: string): ExpenseCategory {
  if (!description || description.trim().length === 0) {
    return ExpenseCategory.Uncategorized;
  }

  const lower = description.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const categoryEnum = Number(category) as ExpenseCategory;
    if (categoryEnum === ExpenseCategory.Uncategorized) continue;

    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return categoryEnum;
      }
    }
  }

  return ExpenseCategory.Uncategorized;
}
