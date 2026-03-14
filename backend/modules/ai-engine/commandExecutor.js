/**
 * Command Executor Module
 * Executes AI commands in sequence: add_to_cart, remove_item, select_address, checkout, payment
 */

const MenuItem = require('../../models/MenuItem');
const Order = require('../../models/Order');
const User = require('../../models/User');
const Counter = require('../../models/Counter');
const MenuFetcher = require('./menuFetcher');
const AddressMatcher = require('./addressMatcher');

class CommandExecutor {
  /**
   * Execute all commands in order
   * @param {Array} commands - Array of commands to execute
   * @param {Object} context - Execution context (user, cart, etc.)
   * @returns {Object} - Execution results
   */
static async executeCommands(commands, context) {
    const results = {
      success: true,
      commands: [],
      cartItems: [],
      selectedAddress: null,
      order: null,
      message: ''
    };

// Hydrate cart items - ensure all items have full menuItem object
    // This handles legacy carts that might have items with just ID

    // Check if payment method is provided in commands
    const hasPaymentCommand = commands.some(c => c.action === 'payment');
    
    // Track if checkout was already completed (by auto-trigger)
    let checkoutAlreadyCompleted = false;
    
    for (const command of commands) {
      let result;
      
      try {
        switch (command.action) {
          case 'add_to_cart':
            result = await this.addToCart(command, context);
            results.cartItems.push(...result.items);
            break;
            
          case 'remove_item':
            result = await this.removeFromCart(command, context);
            results.cartItems = result.items;
            break;
            
          case 'select_address':
            result = await this.selectAddress(command, context);
            results.selectedAddress = result.address;
            
// REMOVED: Auto-checkout blocked per new checkout flow
            // Users must manually proceed to checkout page
            break;
            
          case 'checkout':
            // Skip checkout if it was already completed by auto-trigger
            if (checkoutAlreadyCompleted) {
              console.log('Skipping explicit checkout - already completed by auto-trigger');
              result = { success: true, order: results.order, message: 'Checkout already completed' };
            } else {
              result = await this.checkout(context);
              checkoutAlreadyCompleted = true;
            }
            // No real order created - use summary for checkout preview
            // results.order = result.order; // REMOVED
            context.summary = result.summary; // Store for response
            break;
            
          case 'payment':
            result = await this.processPayment(command, context);
            results.paymentResult = result;
            break;
            
          default:
            result = { success: false, error: `Unknown action: ${command.action}` };
        }
        
        results.commands.push({
          action: command.action,
          success: result.success,
          error: result.error,
          details: result
        });
        
        if (!result.success && command.action !== 'remove_item') {
          // Allow remove failures to pass through
          results.success = false;
          results.message = result.error || 'Command execution failed';
          break;
        }
        
      } catch (error) {
        console.error(`Command ${command.action} error:`, error);
        results.commands.push({
          action: command.action,
          success: false,
          error: error.message
        });
        results.success = false;
        results.message = error.message;
      }
    }

    // Generate summary message
    results.message = this.generateSummaryMessage(results);
    
    return results;
  }

  /**
   * Hydrate cart items - ensure all items have full menuItem object
   * This handles legacy carts that might have items with just ID or missing fields
   * @param {Array} cart - Cart items
   * @returns {Array} - Hydrated cart items
   */
  static async hydrateCartItems(cart) {
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return cart;
    }

    // Find items that need hydration (don't have full menuItem object)
    const itemsNeedingHydration = cart.filter(item => {
      // Item needs hydration if menuItem is a string (ID only) or missing essential fields
      return typeof item.menuItem === 'string' || 
             !item.menuItem || 
             !item.menuItem.name || 
             !item.menuItem.price;
    });

    if (itemsNeedingHydration.length === 0) {
      // All items are already hydrated
      return cart;
    }

    // Get unique menuItem IDs that need fetching
    const menuItemIds = [...new Set(itemsNeedingHydration.map(item => {
      return typeof item.menuItem === 'string' ? item.menuItem : item.menuItem?._id;
    }).filter(Boolean))];

    // Fetch full menu items from database
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } }).lean();
    const menuItemMap = new Map(menuItems.map(item => [item._id.toString(), item]));

    // Hydrate each item
    return cart.map(item => {
      // Check if item needs hydration
      const needsHydration = typeof item.menuItem === 'string' || 
                           !item.menuItem || 
                           !item.menuItem.name || 
                           !item.menuItem.price;
      
      if (needsHydration) {
        const menuItemId = typeof item.menuItem === 'string' ? item.menuItem : item.menuItem?._id;
        const fullMenuItem = menuItemMap.get(menuItemId?.toString());
        
        if (fullMenuItem) {
          return {
            menuItem: fullMenuItem,
            quantity: item.quantity || 1
          };
        }
      }
      
      // Item doesn't need hydration or couldn't find full data, return as is
      return item;
    });
  }

  /**
   * Add items to cart
   * Combines items with the same name/size instead of adding as separate entries
   * @param {Object} command - Add to cart command
   * @param {Object} context - Execution context
   * @returns {Object} - Result
   */
  static async addToCart(command, context) {
    const items = [];
    const errors = [];

    // Get menu item
    let menuItem = command.menuItemId 
      ? await MenuItem.findById(command.menuItemId)
      : await MenuFetcher.matchMenuItem(command.itemName, command.size);

    if (!menuItem) {
      return {
        success: false,
        error: `Item "${command.itemName}" not found or unavailable`,
        items: []
      };
    }

    // Convert Mongoose document to plain object for proper JSON serialization
    const menuItemObj = menuItem.toObject ? menuItem.toObject() : menuItem;
    const quantity = command.quantity || 1;
    
    // Check if item already exists in cart - if so, update quantity
    // Compare by menuItem ID to properly combine duplicates
    const menuItemIdStr = menuItemObj._id?.toString() || menuItemObj._id;
    const itemSize = command.size || menuItemObj.size || null;
    
    const existingItemIndex = context.cart.findIndex(item => {
      // Get the cart item's menuItem ID - handle both old and new structures
      const cartItemMenuItem = item.menuItem;
      const cartItemId = cartItemMenuItem?._id?.toString() || 
                        (typeof cartItemMenuItem === 'string' ? cartItemMenuItem : null);
      const cartItemSize = item.size || cartItemMenuItem?.size || null;
      
      // Match by ID AND size (if specified)
      const idMatch = cartItemId === menuItemIdStr;
      const sizeMatch = !itemSize || !cartItemSize || itemSize === cartItemSize;
      
      return idMatch && sizeMatch;
    });
    
    if (existingItemIndex >= 0) {
      // Item exists - update quantity (combine)
      context.cart[existingItemIndex].quantity += quantity;
      items.push(context.cart[existingItemIndex]);
      
      return {
        success: true,
        items,
        itemName: menuItem.name,
        quantity: context.cart[existingItemIndex].quantity,
        totalPrice: menuItem.price * context.cart[existingItemIndex].quantity,
        message: `Updated ${menuItem.name} quantity to ${context.cart[existingItemIndex].quantity} in cart`
      };
    } else {
      // Item doesn't exist - add new entry
      const newItem = {
        menuItem: menuItemObj,
        quantity: quantity,
        size: itemSize
      };
      context.cart.push(newItem);
      items.push(newItem);
      
      return {
        success: true,
        items,
        itemName: menuItem.name,
        quantity,
        totalPrice: menuItem.price * quantity,
        message: `Added ${quantity} x ${menuItem.name} to cart`
      };
    }
  }

  /**
   * Remove item from cart
   * @param {Object} command - Remove item command
   * @param {Object} context - Execution context
   * @returns {Object} - Result
   */
  static async removeFromCart(command, context) {
    const itemName = command.itemName?.toLowerCase();
    
    // Find and remove matching items - support both old and new cart structure
    const originalLength = context.cart.length;
    context.cart = context.cart.filter(item => {
      // New structure: item.menuItem.name, Old structure: item.itemName
      const cartItemName = item.menuItem?.name?.toLowerCase() || item.itemName?.toLowerCase() || '';
      return !cartItemName.includes(itemName);
    });

    const removedCount = originalLength - context.cart.length;

    if (removedCount === 0) {
      return {
        success: false,
        error: `Item "${command.itemName}" not found in cart`,
        items: context.cart
      };
    }

    return {
      success: true,
      items: context.cart,
      removedItem: command.itemName,
      removedCount,
      message: `Removed ${removedCount} item(s) from cart`
    };
  }

  /**
   * Select delivery address
   * @param {Object} command - Select address command
   * @param {Object} context - Execution context
   * @returns {Object} - Result
   */
  static async selectAddress(command, context) {
    let address = null;
    let addressSource = '';

    // Try to get address by index first
    if (command.addressIndex !== undefined) {
      address = await AddressMatcher.selectAddressByIndex(
        context.userId,
        command.addressIndex
      );
      if (address) {
        addressSource = 'saved_address_index';
      }
    }
    
    // Try to match address from voice input (now includes handling for no saved addresses)
    if (!address && command.addressText) {
      address = await AddressMatcher.matchAddress(
        context.userId,
        command.addressText
      );
      if (address) {
        addressSource = 'voice_input_matched';
      }
    }
    
    // Extract address from raw input as fallback
    if (!address && command.addressText) {
      address = AddressMatcher.extractAddressFromInput(command.addressText);
      if (address) {
        addressSource = 'voice_input_extracted';
      }
    }

    // Use default address from user profile if available
    if (!address && context.user?.addresses?.length > 0) {
      address = context.user.addresses[0];
      addressSource = 'user_default';
    }

    // If still no address, return error but don't block checkout - just warn
    if (!address) {
      // Instead of failing completely, we'll use a placeholder address for delivery
      // This allows the order to proceed and the user can confirm address later
      address = {
        street: 'Address not specified',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
        isPlaceholder: true
      };
      addressSource = 'placeholder';
      
      context.selectedAddress = address;
      
      return {
        success: true,  // Changed to true to allow order to proceed
        address,
        formattedAddress: 'Address will be confirmed later',
        message: 'Please confirm your delivery address after order placement',
        isPlaceholder: true
      };
    }

    context.selectedAddress = address;
    
    return {
      success: true,
      address,
      formattedAddress: AddressMatcher.formatAddress(address),
      message: `Delivery address set to: ${AddressMatcher.formatAddress(address)}`,
      addressSource
    };
  }

  /**
   * Get next order number from counter
   * @returns {Promise<number>} - Next order number
   */
  static async getNextOrderNumber() {
    try {
      const counter = await Counter.findOneAndUpdate(
        { name: 'orderNumber' },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
      );
      return counter.sequence;
    } catch (error) {
      console.error('Error getting order number:', error);
      // Fallback to timestamp-based number
      return Math.floor(Date.now() / 1000);
    }
  }

  /**
   * Process checkout
   * @param {Object} context - Execution context
   * @returns {Object} - Result
   */
  static async checkout(context) {
    if (!context.cart || context.cart.length === 0) {
      return {
        success: false,
        error: 'Cart is empty. Add items before checkout.',
        summary: null
      };
    }

    if (!context.selectedAddress) {
      return {
        success: false,
        error: 'Please select a delivery address before checkout.',
        summary: null
      };
    }

    // Calculate checkout summary (NO ORDER CREATION)
    let totalAmount = 0;
    
    const orderItems = context.cart.map(item => {
      const itemPrice = item.menuItem?.price || item.price || 0;
      const itemTotal = itemPrice * item.quantity;
      totalAmount += itemTotal;
      
      return {
        menuItem: item.menuItem?._id || item.menuItem,
        quantity: item.quantity,
        price: itemPrice,
        name: item.menuItem?.name || 'Unknown'
      };
    });

    // Tax and delivery (matching frontend)
    const taxRate = 0.05;
    const deliveryCharge = 2.99;
    const taxAmount = totalAmount * taxRate;
    const grandTotal = totalAmount + taxAmount + deliveryCharge;

    const summary = {
      items: orderItems,
      subtotal: totalAmount,
      taxAmount,
      deliveryCharge,
      totalAmount: grandTotal,
      address: context.selectedAddress,
      readyForCheckout: true
    };

    // DO NOT clear cart - keep for checkout page
    // DO NOT create Order - checkout page handles this after payment

    return {
      success: true,
      summary,
      message: `Checkout ready! Total: ₹${grandTotal.toFixed(2)}. Proceed to checkout page for payment.`
    };
  }

  /**
   * Process payment
   * @param {Object} command - Payment command
   * @param {Object} context - Execution context
   * @returns {Object} - Result
   */
  static async processPayment(command, context) {
    // BLOCK ALL PAYMENTS FROM VOICE - Must use checkout page
    return {
      success: false,
      error: 'Payments must be completed manually on the checkout page. Voice ordering cannot process payments.',
      paymentMethod: command.paymentMethod || 'blocked',
      message: 'Redirecting to checkout page for secure online payment (UPI, Card, Net Banking).'
    };
  }

  /**
   * Generate summary message from results
   * @param {Object} results - Execution results
   * @returns {string}
   */
  static generateSummaryMessage(results) {
    const messages = [];

    // Cart items added
    const addedItems = results.commands
      .filter(c => c.action === 'add_to_cart' && c.success)
      .map(c => c.details?.itemName)
      .filter(Boolean);
    
    if (addedItems.length > 0) {
      messages.push(`Added: ${addedItems.join(', ')}`);
    }

    // Items removed
    const removedItems = results.commands
      .filter(c => c.action === 'remove_item' && c.success)
      .map(c => c.details?.removedItem)
      .filter(Boolean);
    
    if (removedItems.length > 0) {
      messages.push(`Removed: ${removedItems.join(', ')}`);
    }

    // Address selected
    const addressCmd = results.commands.find(c => c.action === 'select_address' && c.success);
    if (addressCmd) {
      messages.push(`Address: ${addressCmd.details?.formattedAddress}`);
    }

    // Checkout ready (no order placed)
    const checkoutCmd = results.commands.find(c => c.action === 'checkout' && c.success);
    if (checkoutCmd && checkoutCmd.details?.summary) {
      messages.push(`Checkout ready! Total: ₹${checkoutCmd.details.summary.totalAmount.toFixed(2)}`);
    }

    // Payment
    const paymentCmd = results.commands.find(c => c.action === 'payment' && c.success);
    if (paymentCmd) {
      messages.push(paymentCmd.details?.message);
    }

    // Errors
    const errors = results.commands
      .filter(c => !c.success && c.error)
      .map(c => c.error);
    
    if (errors.length > 0) {
      messages.push(`Issues: ${errors.join('; ')}`);
    }

    return messages.join('. ') || 'Processing complete';
  }
}

module.exports = CommandExecutor;
