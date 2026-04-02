/**
 * Intent Detector Module
 * Detects multiple intents from voice input using NLP patterns
 */

class IntentDetector {
  // Intent patterns - expanded for better matching
  static intentPatterns = {
    add_to_cart: [
      /\b(get|want|need|have|add|place|purchase|can|could|may|like|wish|request)\b/i,
      /\b(\d+)\s*(pieces?|pcs?|orders?|qty|quantity|plates?|bowls?)?\s*(of\s+)?/i,
      /\b(pizza|burger|pasta|biryani|rice|curry|noodles|soup|salad|drink|beverage|dessert|chicken|mutton|fish|veg|non-veg)\b/i,
      /\b(large|medium|small|xl|l|m|s)\s*(size)?\b/i,
      /\b(half|full)\b/i,
      /\b(for\s+(one|two|three|four|me))\b/i,
      /\border\s+(a\s+)?(pizza|burger|pasta|biryani|rice|curry|noodles|soup|salad|drink|beverage|dessert|chicken|mutton|fish|veg|non-veg)\b/i,
      /\b(order\s+\d+)\b/i,
      /\b(buy)\b/i
    ],
    remove_item: [
      /\b(remove|delete|cancel|undo|delete|don't\s+want|no\s+more|without|exclude)\b/i,
      /\b(remove\s+(the\s+)?(pizza|burger|pasta|biryani|rice|curry|noodles|soup|salad|drink|beverage|dessert|chicken|mutton|fish|veg|non-veg))\b/i,
      /\b(don't\s+include|skip\s+the)\b/i
    ],
    select_address: [
      /\b(deliver\s+to|delivery\s+to|send\s+to|at\s+(my\s+)?|to\s+(my\s+)?|deliver\s+at)\b/i,
      /\b(my\s+(home|office)\s+address|home\s+address|office\s+address)\b/i,
      /\b(street|road|lane|avenue|block|building|apartment|flat|floor|house|home|office)\b/i,
      /\b(\d+\s*(street|road|lane|avenue|block|building|apartment|flat|floor))\b/i,
      /\b(my\s+(home|office|address)|this\s+address)\b/i,
      /\b(same\s+as\s+(before|last)|previous\s+address)\b/i,
      /\bat\s+my\s+(home|office)\s+address\b/i
    ],
    checkout: [
      /\b(checkout|place\s+order|confirm\s+order|complete\s+order|finish\s+order|proceed|confirm)\b/i,
      /\b(that's\s+all|that\s+is\s+it|no\s+more|i'm\s+done|done|that's\s+it)\b/i,
      /\b(ready\s+to\s+order|go\s+ahead|proceed\s+to\s+payment)\b/i,
      // NEW: Add patterns for immediate order placement
      /\b(order|order\s+now|order\s+this)\b/i,
      /\b(buy\s+this|get\s+this|purchase)\b/i,
      /\b(deliver\s+now|delivery\s+now)\b/i
    ],
    payment: [
      /\b(pay|payment|online|card|upi|wallet|cash|google\s+pay|phonepe|paytm)\b/i,
      /\b(pay\s+(with|using)|pay\s+now|pay\s+online)\b/i,
      /\b(cash\s+on\s+delivery|cod|order\s+and\s+pay)\b/i
    ],
    get_menu: [
      /\b(show\s+menu|what's?\s+available|what\s+do\s+you\s+have|menu\s+please|see\s+menu)\b/i,
      /\b(list|items?|options?|varieties?)\b/i,
      /\b(recommend|suggest|popular|best|special)\b/i
    ]
  };

  // Quantity keywords
  static quantityKeywords = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'a': 1, 'an': 1, 'single': 1, 'couple': 2, 'pair': 2,
    'dozen': 12, 'half': 0.5, 'quarter': 0.25,
    // New quantity keywords
    'plate': 1, 'plates': 1,
    'piece': 1, 'pieces': 1,
    'serving': 1, 'servings': 1,
    'portion': 1, 'portions': 1,
    'bowl': 1, 'bowls': 1,
    'cup': 1, 'cups': 1,
    'glass': 1, 'glasses': 1,
    'bottle': 1, 'bottles': 1,
    'pack': 1, 'packs': 1,
    'dinner': 1, 'lunch': 1, 'meal': 1
  };

// Size keywords
  static sizeKeywords = {
    'small': 'small', 's': 'small', 'medium': 'medium', 'm': 'medium',
    'large': 'large', 'l': 'large', 'xl': 'extra-large', 'extra-large': 'extra-large'
  };

  // Spice keywords (NEW for customizations)
  static spiceKeywords = {
    'low': 'low', 'less': 'low', 'mild': 'low', 'light': 'low',
    'medium': 'medium', 'normal': 'medium',
    'high': 'high', 'spicy': 'high', 'hot': 'high', 'extra spicy': 'high'
  };


  /**
   * Detect all intents from voice input
   * @param {string} voiceInput - Raw voice input text
   * @returns {Object} - Detected intents with confidence scores
   */
  static detectIntents(voiceInput) {
    if (!voiceInput || typeof voiceInput !== 'string') {
      return { intents: [], entities: {} };
    }

    const normalizedInput = voiceInput.toLowerCase().trim();
    const detectedIntents = [];
    const entities = {
      items: [],
      quantities: [],
      sizes: [],
      spices: [],  // NEW: Spice customizations
      addresses: [],
      paymentMethod: null
    };


    // Check each intent pattern
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      let matchCount = 0;
      for (const pattern of patterns) {
        // Reset lastIndex to avoid state issues with regex global flag
        pattern.lastIndex = 0;
        if (pattern.test(normalizedInput)) {
          matchCount++;
        }
      }
      
      if (matchCount > 0) {
        detectedIntents.push({
          intent,
          confidence: Math.min(matchCount / patterns.length, 1)
        });
      }
    }

    // Extract entities
    this.extractItems(normalizedInput, entities);
    this.extractQuantities(normalizedInput, entities);
    this.extractSizes(normalizedInput, entities);
    this.extractSpice(normalizedInput, entities); // NEW: Spice extraction
    this.extractPaymentMethod(normalizedInput, entities);
    this.extractAddress(normalizedInput, entities);


    // Sort intents by confidence
    detectedIntents.sort((a, b) => b.confidence - a.confidence);

    return {
      intents: detectedIntents,
      entities
    };
  }

  /**
   * Extract menu items from input
   * @param {string} input - Normalized input
   * @param {Object} entities - Entities object to populate
   */
  static extractItems(input, entities) {
    // COMPOUND ITEMS - Check these FIRST before individual items
    // Use a Map to store unique compound items
    const compoundItemsFound = new Map();
    
    const compoundFoodPatterns = [
      { pattern: /\b(chicken\s+masala)\b/gi, name: 'chicken masala' },
      { pattern: /\b(mutton\s+masala)\b/gi, name: 'mutton masala' },
      { pattern: /\b(chicken\s+biryani)\b/gi, name: 'chicken biryani' },
      { pattern: /\b(mutton\s+biryani)\b/gi, name: 'mutton biryani' },
      { pattern: /\b(prawns?\s+biryani)\b/gi, name: 'prawn biryani' },
      { pattern: /\b(egg\s+biryani)\b/gi, name: 'egg biryani' },
      { pattern: /\b(veg\s+biryani)\b/gi, name: 'veg biryani' },
      { pattern: /\b(vegetable\s+biryani)\b/gi, name: 'vegetable biryani' },
      { pattern: /\b(chicken\s+pizza)\b/gi, name: 'chicken pizza' },
      { pattern: /\b(pepper\s+pizza)\b/gi, name: 'pepper pizza' },
      { pattern: /\b(margherita\s+pizza)\b/gi, name: 'margherita pizza' },
      { pattern: /\b(cheese\s+pizza)\b/gi, name: 'cheese pizza' },
      { pattern: /\b(veg\s+pizza)\b/gi, name: 'veg pizza' },
      { pattern: /\b(non\s*veg\s*pizza)\b/gi, name: 'non veg pizza' },
      { pattern: /\b(chicken\s+burger)\b/gi, name: 'chicken burger' },
      { pattern: /\b(veg\s+burger)\b/gi, name: 'veg burger' },
      { pattern: /\b(chicken\s+curry)\b/gi, name: 'chicken curry' },
      { pattern: /\b(mutton\s+curry)\b/gi, name: 'mutton curry' },
      { pattern: /\b(butter\s+chicken)\b/gi, name: 'butter chicken' },
      { pattern: /\b(butter\s+paneer)\b/gi, name: 'butter paneer' },
    ];

    for (const { pattern, name } of compoundFoodPatterns) {
      const matches = input.match(pattern);
      if (matches) {
        for (const match of matches) {
          const compoundName = match.toLowerCase();
          // Use Map to avoid duplicates
          if (!compoundItemsFound.has(compoundName)) {
            compoundItemsFound.set(compoundName, true);
            entities.items.push(compoundName);
          }
        }
      }
    }

    // Only add individual items if no compound items were found
    if (compoundItemsFound.size === 0) {
      const individualFoodPatterns = [
        /\b(pizza|pizzas?)\b/gi,
        /\b(burger|burgers?)\b/gi,
        /\b(pasta|pastas?)\b/gi,
        /\b(biryani|biryanis?)\b/gi,
        /\b(curry|curries?)\b/gi,
        /\b(noodles?|noodle)\b/gi,
        /\b(rice|rices?)\b/gi,
        /\b(soup|soups?)\b/gi,
        /\b(salad|salads?)\b/gi,
        /\b(drinks?|beverages?)\b/gi,
        /\b(desserts?|sweet|dessert)\b/gi,
        /\b(chicken|chickens?)\b/gi,
        /\b(mutton|mutton)\b/gi,
        /\b(fish|fishes?|fish)\b/gi,
        /\b(paneer|tofu)\b/gi,
        /\b(veg|vegetable|vegetables)\b/gi,
        /\b(non-veg|non veg|nonveg)\b/gi,
        /\b(fries|french fries)\b/gi,
        /\b(sandwich|sandwiches?)\b/gi,
        /\b(wrap|wraps?)\b/gi,
        /\b(tacos?|taco)\b/gi,
        /\b(burrito|burritos?)\b/gi,
        /\b(ice cream|icecream)\b/gi,
        /\b(lassi|lassis?)\b/gi,
        /\b(tea|coffe|coffee)\b/gi,
        /\b(juice|juices?)\b/gi,
        /\b(water|bottled water)\b/gi,
        /\b(dhokla|dhoklas?)\b/gi,
        /\b(idli|idlis?)\b/gi,
        /\b(dosa|dosas?)\b/gi,
        /\b(uttapam|uttapams?)\b/gi,
        /\b(naan|naans?|roti|rotis?)\b/gi,
        /\b(paratha|parathas?)\b/gi,
        /\b(kebab|kebabs?)\b/gi,
        /\b(tandoori)\b/gi,
        /\b(masala)\b/gi
      ];

      for (const pattern of individualFoodPatterns) {
        const matches = input.match(pattern);
        if (matches) {
          entities.items.push(...matches.map(m => m.toLowerCase()));
        }
      }
    }

    // Remove duplicates while preserving order
    const seen = new Set();
    entities.items = entities.items.filter(item => {
      const isDuplicate = seen.has(item);
      seen.add(item);
      return !isDuplicate;
    });
  }

  /**
   * Extract quantities from input
   * @param {string} input - Normalized input
   * @param {Object} entities - Entities object to populate
   */
  static extractQuantities(input, entities) {
    // Extract numeric quantities
    const numericQuantities = input.match(/\b(\d+)\b/g);
    if (numericQuantities) {
      entities.quantities.push(...numericQuantities.map(q => parseInt(q, 10)));
    }

    // Extract word quantities
    for (const [word, value] of Object.entries(this.quantityKeywords)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      // Reset lastIndex to avoid state issues
      regex.lastIndex = 0;
      if (regex.test(input)) {
        entities.quantities.push(value);
      }
    }

    // Extract quantity patterns like "2 pieces", "3 orders"
    const quantityPatterns = [
      /(\d+)\s*(pieces?|pcs?)/gi,
      /(\d+)\s*(orders?)/gi,
      /(\d+)\s*(qty|quantity)/gi,
      /(\d+)\s*(plates?)/gi,
      /(\d+)\s*(bowls?)/gi,
      /(\d+)\s*(cups?)/gi,
      /(\d+)\s*(bottles?)/gi,
      /(\d+)\s*(cans?)/gi
    ];

    for (const pattern of quantityPatterns) {
      const matches = input.match(pattern);
      if (matches) {
        for (const match of matches) {
          const num = match.match(/(\d+)/);
          if (num) {
            entities.quantities.push(parseInt(num[1], 10));
          }
        }
      }
    }

    // Remove duplicates and invalid values
    entities.quantities = [...new Set(entities.quantities.filter(q => q > 0))];
  }

  /**
   * Extract sizes from input
   * @param {string} input - Normalized input
   * @param {Object} entities - Entities object to populate
   */
  static extractSizes(input, entities) {
    for (const [keyword, size] of Object.entries(this.sizeKeywords)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(input)) {
        entities.sizes.push(size);
      }
    }

    // Extract half/full for pizzas
    if (/\b(half)\b/i.test(input)) {
      entities.sizes.push('half');
    }
    if (/\b(full)\b/i.test(input)) {
      entities.sizes.push('full');
    }

    entities.sizes = [...new Set(entities.sizes)];
  }

  /**
   * Extract spice levels from input (NEW)
   * @param {string} input - Normalized input
   * @param {Object} entities - Entities object to populate
   */
  static extractSpice(input, entities) {
    for (const [keyword, spice] of Object.entries(this.spiceKeywords)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      regex.lastIndex = 0;
      if (regex.test(input)) {
        entities.spices.push(spice);
        return; // Use first match
      }
    }
    entities.spices = [...new Set(entities.spices)];
  }


  /**
   * Extract payment method from input
   * @param {string} input - Normalized input
   * @param {Object} entities - Entities object to populate
   */
  static extractPaymentMethod(input, entities) {
    const paymentMethods = {
      'card': ['card', 'credit card', 'debit card', 'visa', 'mastercard', 'rupay'],
      'upi': ['upi', 'google pay', 'phonepe', 'paytm', 'bhim', 'phone pe'],
      'wallet': ['wallet', 'amazon pay', 'mobikwik', 'freecharge'],
      'cash': ['cash', 'cod', 'cash on delivery', 'cash on delivery'],
      'netbanking': ['net banking', 'online banking', 'bank transfer']
    };

    for (const [method, keywords] of Object.entries(paymentMethods)) {
      for (const keyword of keywords) {
        if (input.includes(keyword)) {
          entities.paymentMethod = method;
          return;
        }
      }
    }
  }

  /**
   * Extract address from input
   * @param {string} input - Normalized input
   * @param {Object} entities - Entities object to populate
   */
  static extractAddress(input, entities) {
    // Extract zip/postal codes
    const zipCodeMatch = input.match(/\b(\d{5,6})\b/);
    if (zipCodeMatch) {
      entities.addresses.push({ zipCode: zipCodeMatch[1] });
    }

    // Common address keywords
    const addressKeywords = ['street', 'road', 'lane', 'avenue', 'block', 'building', 
                           'apartment', 'flat', 'floor', 'house', 'home', 'office',
                           'sector', 'area', 'colony', 'nagar', ' Chowk'];

    for (const keyword of addressKeywords) {
      if (input.includes(keyword)) {
        const regex = new RegExp(`.{0,30}${keyword}.{0,20}`, 'gi');
        const matches = input.match(regex);
        if (matches) {
          entities.addresses.push(...matches.map(m => ({ text: m.trim() })));
        }
      }
    }
  }

  /**
   * Determine execution order for multi-intent
   * @param {Array} intents - Detected intents
   * @returns {Array} - Ordered intents for execution
   */
  static getExecutionOrder(intents) {
    const executionOrder = {
      'add_to_cart': 1,
      'remove_item': 2,
      'select_address': 3,
      'checkout': 4,
      'payment': 5,
      'get_menu': 6
    };

    return [...intents].sort((a, b) => {
      const orderA = executionOrder[a.intent] || 99;
      const orderB = executionOrder[b.intent] || 99;
      return orderA - orderB;
    });
  }
}

module.exports = IntentDetector;
