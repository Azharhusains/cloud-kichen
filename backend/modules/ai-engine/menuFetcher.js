/**
 * Menu Fetcher Module
 * Dynamically fetches and matches menu items from database
 */

const MenuItem = require('../../models/MenuItem');
const Category = require('../../models/Category');

class MenuFetcher {
  /**
   * Get all available menu items
   * @param {boolean} activeOnly - Only return active items
   * @returns {Promise<Array>} - Menu items
   */
  static async getAllMenuItems(activeOnly = true) {
    try {
      const query = activeOnly ? { isAvailable: true } : {};
      return await MenuItem.find(query)
        .populate('category', 'name')
        .sort({ name: 1 })
        .lean();
    } catch (error) {
      console.error('Menu Fetch Error:', error);
      return [];
    }
  }

  /**
   * Get menu items by category
   * @param {string} categoryName - Category name
   * @returns {Promise<Array>} - Menu items in category
   */
  static async getMenuByCategory(categoryName) {
    try {
      const category = await Category.findOne({ 
        name: { $regex: new RegExp(categoryName, 'i') } 
      });
      
      if (!category) {
        return [];
      }
      
      return await MenuItem.find({ 
        category: category._id,
        isAvailable: true 
      })
        .populate('category', 'name')
        .lean();
    } catch (error) {
      console.error('Menu By Category Error:', error);
      return [];
    }
  }

  /**
   * Search menu items by name or description
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} - Matching menu items
   */
  static async searchMenuItems(searchTerm) {
    try {
      return await MenuItem.find({
        isAvailable: true,
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { ingredients: { $regex: searchTerm, $options: 'i' } }
        ]
      })
        .populate('category', 'name')
        .lean();
    } catch (error) {
      console.error('Menu Search Error:', error);
      return [];
    }
  }

  /**
   * Match menu item from voice input
   * @param {string} itemName - Item name from voice
   * @param {string} size - Item size if specified
   * @returns {Promise<Object|null>} - Matched menu item
   */
  static async matchMenuItem(itemName, size = null) {
    try {
      if (!itemName) return null;

      // Clean the item name
      const cleanedName = this.cleanItemName(itemName);
      console.log('Matching menu item for:', cleanedName);
      
      // Get all available menu items for matching
      const allMenuItems = await MenuItem.find({ isAvailable: true })
        .populate('category', 'name')
        .lean();
      
      // Create a lowercase map for exact matching
      const menuItemMap = new Map();
      allMenuItems.forEach(item => {
        menuItemMap.set(item.name.toLowerCase(), item);
      });

      // FIRST: Try exact match first (case insensitive) - strict match
      let menuItem = allMenuItems.find(item => 
        item.name.toLowerCase() === cleanedName.toLowerCase()
      );
      
      if (menuItem) {
        console.log('Exact match found:', menuItem.name);
        return this.formatMenuItem(menuItem, size);
      }

      // If no exact match, item is not in menu - return error
      // DO NOT fall back to partial matching
      // This prevents "chicken" from matching "chicken biryani"
      console.log('No exact match found for:', cleanedName);
      console.log('Available items:', allMenuItems.map(i => i.name).join(', '));
      
      return null;
    } catch (error) {
      console.error('Menu Match Error:', error);
      return null;
    }
  }

  /**
   * Match multiple items from voice input
   * @param {Array} itemNames - Array of item names
   * @returns {Promise<Array>} - Matched menu items
   */
  static async matchMultipleItems(itemNames) {
    const results = [];
    
    for (const itemName of itemNames) {
      const matched = await this.matchMenuItem(itemName);
      if (matched) {
        results.push(matched);
      }
    }
    
    return results;
  }

  /**
   * Match item using category context
   * @param {string} itemName - Item name
   * @returns {Promise<Object|null>} - Matched item
   */
  static async matchWithCategory(itemName) {
    // Get all categories
    const categories = await Category.find({ isActive: true }).lean();
    
    for (const category of categories) {
      // Check if item name matches category
      if (category.name.toLowerCase().includes(itemName.toLowerCase())) {
        // Get first item in this category
        const item = await MenuItem.findOne({
          category: category._id,
          isAvailable: true
        }).populate('category', 'name');
        
        if (item) {
          return item;
        }
      }
    }
    
    return null;
  }

  /**
   * Clean item name for matching
   * @param {string} itemName - Raw item name
   * @returns {string} - Cleaned name
   */
  static cleanItemName(itemName) {
    if (!itemName) return '';
    
    // First, preserve compound words by protecting them
    // Don't clean individual words that are part of dish names
    
    // Just do basic cleanup - remove extra spaces and convert to lowercase
    // Don't replace words like "chicken" with just "chicken" alone
    // as it destroys compound dish names like "chicken masala"
    return itemName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')  // Normalize spaces
      .replace(/[^a-z\s]/g, ''); // Keep only letters and spaces
  }

  /**
   * Format menu item with size
   * @param {Object} menuItem - Menu item from DB
   * @param {string} size - Size specification
   * @returns {Object} - Formatted item
   */
  static formatMenuItem(menuItem, size) {
    const baseItem = {
      _id: menuItem._id,
      name: menuItem.name,
      description: menuItem.description,
      price: menuItem.price,
      category: menuItem.category,
      image: menuItem.image,
      ingredients: menuItem.ingredients,
      isAvailable: menuItem.isAvailable
    };

    // Handle size-based pricing
    if (size && menuItem.sizePrices) {
      const sizePrice = menuItem.sizePrices.find(
        s => s.size.toLowerCase() === size.toLowerCase()
      );
      if (sizePrice) {
        baseItem.price = sizePrice.price;
        baseItem.size = size;
      }
    }

    return baseItem;
  }

  /**
   * Get menu item by ID
   * @param {string} itemId - Menu item ID
   * @returns {Promise<Object|null>} - Menu item
   */
  static async getMenuItemById(itemId) {
    try {
      return await MenuItem.findById(itemId).populate('category', 'name').lean();
    } catch (error) {
      console.error('Get Menu Item Error:', error);
      return null;
    }
  }

  /**
   * Get all available categories
   * @returns {Promise<Array>} - Categories
   */
  static async getCategories() {
    try {
      return await Category.find({ isActive: true }).sort({ name: 1 }).lean();
    } catch (error) {
      console.error('Get Categories Error:', error);
      return [];
    }
  }
}

module.exports = MenuFetcher;
