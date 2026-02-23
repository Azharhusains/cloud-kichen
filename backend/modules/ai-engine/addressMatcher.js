/**
 * Address Matcher Module
 * Matches and extracts addresses from user profile based on voice input
 */

const User = require('../../models/User');

class AddressMatcher {
  /**
   * Get user's saved addresses
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - User's addresses
   */
  static async getUserAddresses(userId) {
    try {
      const user = await User.findById(userId).select('addresses').lean();
      return user?.addresses || [];
    } catch (error) {
      console.error('Get User Addresses Error:', error);
      return [];
    }
  }

  /**
   * Match address from voice input
   * @param {string} userId - User ID
   * @param {string} addressInput - Address from voice
   * @returns {Promise<Object|null>} - Matched address
   */
  static async matchAddress(userId, addressInput) {
    try {
      const addresses = await this.getUserAddresses(userId);
      
      // If no saved addresses, try to extract address from voice input
      if (!addresses || addresses.length === 0) {
        // Try to extract address from the voice input itself
        const extractedAddress = this.extractAddressFromInput(addressInput);
        if (extractedAddress) {
          return extractedAddress;
        }
        // Return null to indicate no address could be found
        return null;
      }

      // If user says "same address" or "previous address"
      if (this.isSameAddressRequest(addressInput)) {
        return addresses[0];
      }

      // Try to match by address text
      const normalizedInput = addressInput.toLowerCase();
      
      for (const address of addresses) {
        const addressText = this.addressToText(address).toLowerCase();
        
        // Check for zip code match
        if (address.zipCode && addressInput.includes(address.zipCode)) {
          return address;
        }

        // Check for partial text match
        const matchWords = normalizedInput.split(/\s+/).filter(word => word.length > 3);
        let matchCount = 0;
        
        for (const word of matchWords) {
          if (addressText.includes(word)) {
            matchCount++;
          }
        }

        // If more than 50% words match, consider it a match
        if (matchCount >= matchWords.length * 0.5) {
          return address;
        }
      }

      // If no match, return first address as default
      return addresses[0];
    } catch (error) {
      console.error('Address Match Error:', error);
      return null;
    }
  }

  /**
   * Check if user is requesting same/previous address
   * @param {string} input - Voice input
   * @returns {boolean}
   */
  static isSameAddressRequest(input) {
    const sameAddressPatterns = [
      /\b(same\s+(as\s+)?(before|last|previous)|this\s+address)\b/i,
      /\b(my\s+(home|office|default)\s+address)\b/i,
      /\b(usual\s+(address|place))\b/i,
      /\b(continue\s+to\s+(my\s+)?(home|office))\b/i,
      /\b(deliver\s+to\s+(my\s+)?home)\b/i,
      /\b(deliver\s+to\s+(my\s+)?office)\b/i
    ];

    return sameAddressPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Convert address object to searchable text
   * @param {Object} address - Address object
   * @returns {string}
   */
  static addressToText(address) {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode,
      address.country
    ].filter(Boolean);
    
    return parts.join(' ');
  }

  /**
   * Extract address from raw voice input
   * @param {string} input - Raw voice input
   * @returns {Object|null} - Extracted address
   */
  static extractAddressFromInput(input) {
    try {
      const address = {
        street: null,
        city: null,
        state: null,
        zipCode: null,
        country: 'India' // Default country
      };

      // Extract zip code (5-6 digits)
      const zipMatch = input.match(/\b(\d{5,6})\b/);
      if (zipMatch) {
        address.zipCode = zipMatch[1];
      }

      // Extract street number
      const streetMatch = input.match(/(\d+)\s*(street|road|lane|avenue|block|building|flat|floor)/i);
      if (streetMatch) {
        address.street = streetMatch[0];
      }

      // Common Indian cities
      const cities = [
        'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai', 'kolkata',
        'pune', 'ahmedabad', 'jaipur', 'lucknow', 'chandigarh', 'gurgaon',
        'noida', 'faridabad', 'indore', 'bhopal', 'surat', 'vadodara'
      ];
      
      for (const city of cities) {
        if (input.toLowerCase().includes(city)) {
          address.city = city.charAt(0).toUpperCase() + city.slice(1);
          break;
        }
      }

      // Check if we have at least some address data
      if (address.street || address.city || address.zipCode) {
        return address;
      }

      return null;
    } catch (error) {
      console.error('Extract Address Error:', error);
      return null;
    }
  }

  /**
   * Select address by index
   * @param {string} userId - User ID
   * @param {number} index - Address index (0-based)
   * @returns {Promise<Object|null>}
   */
  static async selectAddressByIndex(userId, index) {
    try {
      const addresses = await this.getUserAddresses(userId);
      const numericIndex = parseInt(index, 10);
      
      if (isNaN(numericIndex) || numericIndex < 0 || numericIndex >= addresses.length) {
        return addresses[0] || null;
      }
      
      return addresses[numericIndex];
    } catch (error) {
      console.error('Select Address By Index Error:', error);
      return null;
    }
  }

  /**
   * Format address for display
   * @param {Object} address - Address object
   * @returns {string}
   */
  static formatAddress(address) {
    if (!address) return '';
    
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode,
      address.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  /**
   * Validate address has required fields
   * @param {Object} address - Address to validate
   * @returns {boolean}
   */
  static isValidAddress(address) {
    if (!address) return false;
    
    // Check for minimum required fields
    return !!(address.street || address.city || address.zipCode);
  }
}

module.exports = AddressMatcher;
