import Fuse from 'fuse.js';
import { ExpenseCategory } from '../splitz.model';

const categoryKeywords: Record<number, string[]> = {
  [ExpenseCategory.Food]: [
    // Meals
    'dinner', 'lunch', 'breakfast', 'brunch', 'supper', 'meal', 'eating', 'food', 'snack', 'tiffin', 'dabba',
    // Restaurants & Apps
    'restaurant', 'cafe', 'cafeteria', 'dhaba', 'canteen', 'eatery', 'swiggy', 'zomato', 'blinkit', 'zepto',
    // Beverages
    'coffee', 'tea', 'chai', 'juice', 'smoothie', 'milkshake', 'lassi', 'buttermilk',
    // Fast Food
    'pizza', 'burger', 'sandwich', 'wrap', 'roll', 'noodles', 'pasta', 'momos', 'pav bhaji', 'vada pav',
    // Indian Food
    'biryani', 'curry', 'dal', 'sabzi', 'roti', 'paratha', 'idli', 'dosa', 'poha', 'upma', 'thali', 'paneer',
    // Grocery
    'groceries', 'grocery', 'supermarket', 'vegetables', 'fruits', 'ration', 'provision', 'kirana',
    // Bakery & Sweets
    'bakery', 'cake', 'pastry', 'sweets', 'mithai', 'chocolate', 'ice cream', 'dessert',
    // Others
    'takeout', 'takeaway', 'delivery', 'order food', 'cooking gas', 'packaged food'
  ],

  [ExpenseCategory.Travel]: [
    // Air
    'flight', 'airline', 'airways', 'airport', 'indigo', 'air india', 'spicejet', 'vistara',
    // Stays
    'hotel', 'airbnb', 'resort', 'hostel', 'oyo', 'makemytrip', 'goibibo', 'yatra', 'lodge', 'guesthouse',
    // Trip
    'vacation', 'trip', 'holiday', 'tour', 'travel', 'journey', 'itinerary', 'sightseeing', 'excursion', 'pilgrimage',
    // Documents
    'visa', 'passport', 'travel insurance',
    // Booking
    'booking', 'reservation', 'ticket', 'cleartrip',
    // Misc
    'luggage', 'backpack', 'roaming', 'forex', 'currency exchange', 'travel kit'
  ],

  [ExpenseCategory.Utilities]: [
    // Core
    'electricity', 'water', 'gas', 'lpg', 'pipeline gas', 'utility', 'bill',
    // Internet & Phone
    'internet', 'wifi', 'broadband', 'jio', 'airtel', 'bsnl', 'vi', 'vodafone', 'idea',
    'recharge', 'mobile bill', 'phone bill', 'postpaid', 'prepaid', 'data plan', 'talktime',
    // Other Utilities
    'dth', 'tata sky', 'dish tv', 'cable tv', 'landline', 'piped water', 'sewage', 'property tax',
    'society charges', 'maintenance charges', 'generator', 'inverter battery'
  ],

  [ExpenseCategory.Entertainment]: [
    // OTT
    'netflix', 'prime video', 'hotstar', 'disney', 'sony liv', 'zee5', 'jiocinema', 'mxplayer',
    'youtube premium', 'apple tv', 'voot', 'aha',
    // Music
    'spotify', 'gaana', 'wynk', 'jiosaavn', 'apple music', 'concert', 'live music',
    // Movies & Events
    'movie', 'cinema', 'bookmyshow', 'theatre', 'multiplex', 'pvr', 'inox', 'film',
    // Gaming
    'game', 'gaming', 'playstation', 'xbox', 'steam', 'pubg', 'battleground', 'esports',
    // Others
    'subscription', 'streaming', 'amusement', 'park', 'event', 'show', 'standup', 'comedy', 'circus', 'carnival'
  ],

  [ExpenseCategory.Housing]: [
    // Rent & Ownership
    'rent', 'mortgage', 'emi', 'lease', 'security deposit', 'advance rent', 'pgrent', 'pg',
    // Property
    'apartment', 'flat', 'house', 'home', 'villa', 'plot', 'studio',
    // Maintenance
    'maintenance', 'repair', 'plumber', 'electrician', 'carpenter', 'painter', 'renovation', 'construction',
    'whitewash', 'flooring', 'tiling', 'waterproofing',
    // Appliances
    'fridge', 'refrigerator', 'washing machine', 'ac', 'air conditioner', 'microwave',
    'gas stove', 'chimney', 'geyser', 'water heater', 'fan', 'cooler', 'tv',
    // Furnishing
    'furniture', 'sofa', 'bed', 'mattress', 'wardrobe', 'curtains', 'interior', 'decor',
    // Help
    'cook', 'maid', 'housekeeper', 'watchman', 'cleaning', 'pest control'
  ],

  [ExpenseCategory.Healthcare]: [
    // Consultation
    'doctor', 'physician', 'specialist', 'clinic', 'hospital', 'dentist', 'ophthalmologist',
    'dermatologist', 'gynecologist', 'pediatrician', 'consultation', 'checkup',
    // Medicine
    'medicine', 'tablet', 'capsule', 'syrup', 'injection', 'prescription', 'pharmacy',
    'medplus', 'apollo pharmacy', 'netmeds', '1mg', 'pharmeasy',
    // Tests & Scans
    'lab test', 'blood test', 'x-ray', 'mri', 'scan', 'ecg', 'ultrasound', 'pathology',
    // Insurance & Wellness
    'health insurance', 'mediclaim', 'insurance', 'therapy', 'physiotherapy',
    'mental health', 'counselling', 'vaccination', 'medical', 'surgery', 'emergency',
    // Optical & Dental
    'glasses', 'spectacles', 'lenses', 'eye care', 'braces', 'dental', 'root canal'
  ],

  [ExpenseCategory.Shopping]: [
    // E-commerce
    'amazon', 'flipkart', 'meesho', 'myntra', 'ajio', 'nykaa', 'snapdeal', 'tata cliq', 'reliance digital',
    // Clothing
    'clothing', 'clothes', 'shirt', 'tshirt', 'jeans', 'trousers', 'dress', 'saree', 'kurta',
    'ethnic wear', 'formal wear', 'jacket', 'sweater', 'hoodie', 'leggings', 'shorts', 'skirt',
    // Footwear
    'shoes', 'sandals', 'slippers', 'sneakers', 'heels', 'boots', 'chappal',
    // Accessories
    'bag', 'purse', 'wallet', 'watch', 'sunglasses', 'jewellery', 'belt', 'cap', 'hat',
    // Retail
    'mall', 'store', 'showroom', 'boutique', 'market', 'bazaar', 'purchase', 'order', 'delivery',
    // Electronics
    'mobile', 'phone', 'laptop', 'tablet', 'earphones', 'headphones', 'charger', 'cable', 'accessories',
    // Home Items
    'utensils', 'cookware', 'bedsheet', 'towel', 'household'
  ],

  [ExpenseCategory.Transportation]: [
    // Ride Apps
    'uber', 'ola', 'rapido', 'namma yatri', 'bluemart', 'indrive',
    // Modes
    'taxi', 'cab', 'auto', 'rickshaw', 'bus', 'metro', 'train', 'local train', 'subway',
    'bicycle', 'bike', 'scooter', 'bike taxi', 'two wheeler', 'car',
    // Fuel & Vehicle
    'petrol', 'diesel', 'fuel', 'cng', 'ev charging', 'vehicle service', 'car service',
    'car wash', 'tyre', 'puncture', 'oil change', 'car repair',
    // Payments
    'parking', 'toll', 'fastag', 'commute', 'pass', 'monthly pass', 'season ticket',
    // Long Distance
    'irctc', 'redbus', 'bus ticket', 'train ticket', 'flight ticket'
  ],

  [ExpenseCategory.Education]: [
    // Institutions
    'school', 'college', 'university', 'institute', 'coaching', 'tuition',
    // Fees
    'fee', 'fees', 'admission', 'exam fee', 'registration', 'annual fee', 'semester fee',
    // Online Learning
    'course', 'udemy', 'coursera', 'unacademy', 'byjus', 'vedantu', 'upgrad', 'skillshare',
    'linkedin learning', 'pluralsight', 'edx', 'khan academy',
    // Materials
    'book', 'books', 'stationery', 'notebook', 'pen', 'pencil', 'geometry box', 'study material',
    // Certifications
    'certification', 'training', 'workshop', 'bootcamp', 'seminar', 'webinar', 'class',
    // Exam
    'exam', 'test', 'neet', 'jee', 'upsc', 'gre', 'gmat', 'ielts', 'toefl', 'sat'
  ],

  [ExpenseCategory.Personal]: [
    // Grooming
    'haircut', 'hair color', 'barber', 'shave', 'salon', 'parlour', 'waxing', 'threading',
    'manicure', 'pedicure', 'facial', 'cleanup',
    // Skincare & Beauty
    'skincare', 'moisturizer', 'sunscreen', 'serum', 'face wash', 'makeup', 'cosmetics',
    'perfume', 'deodorant', 'beauty', 'nykaa', 'body lotion',
    // Fitness
    'gym', 'fitness', 'yoga', 'zumba', 'crossfit', 'workout', 'sports',
    'swimming', 'cycling', 'running', 'marathon',
    // Wellness
    'spa', 'massage', 'meditation', 'wellness', 'detox', 'ayurveda',
    // Subscriptions
    'membership', 'self-care', 'grooming kit', 'razor', 'supplement', 'protein'
  ],

  [ExpenseCategory.Other]: [
    // Gifts
    'gift', 'present', 'gifting', 'birthday gift', 'anniversary gift', 'wedding gift',
    // Social
    'donation', 'charity', 'ngo', 'temple', 'church', 'mosque', 'offering', 'prasad',
    // Finance
    'loan', 'emi payment', 'credit card', 'fine', 'penalty', 'late fee', 'bank charge',
    // Legal & Admin
    'notary', 'stamp duty', 'registration', 'legal fee', 'advocate',
    // Misc
    'miscellaneous', 'other', 'misc', 'random', 'unknown', 'general', 'expense'
],
};

// Flatten for Fuse.js
const fuseData = Object.entries(categoryKeywords).flatMap(([category, keywords]) =>
  keywords.map(keyword => ({ keyword, category: Number(category) as ExpenseCategory }))
);

const fuse = new Fuse(fuseData, {
  keys: ['keyword'],
  threshold: 0.3,
  minMatchCharLength: 3,
});

export function categorizeExpense(description: string): ExpenseCategory {
  if (!description?.trim()) return ExpenseCategory.Uncategorized;

  const input = description.toLowerCase().trim();

  // Step 1: Exact contains match
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (input.includes(keyword)) {
        return Number(category) as ExpenseCategory;
      }
    }
  }

  // Step 2: Fuzzy match
  const results = fuse.search(input);
  if (results.length > 0) {
    return results[0].item.category;
  }

  return ExpenseCategory.Uncategorized;
}