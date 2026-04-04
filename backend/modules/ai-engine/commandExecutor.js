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

    // Check if payment method is provided in commands
    const hasPaymentCommand = commands.some(c => c.action === 'payment');
    
    // Track if checkout was already completed (by auto-trigger)
    let checkoutAlreadyCompleted = false;
    
    for (const command of commands) {
      let result;
      
      try {
        switch (command.action) {
          case 'add_item':
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
            break;
            
          case 'checkout':
            if (checkoutAlreadyCompleted) {
              console.log('Skipping explicit checkout - already completed by auto-trigger');
              result = { success: true, order: results.order, message: 'Checkout already completed' };
            } else {
              result = await this.checkout(context);
              checkoutAlreadyCompleted = true;
            }
            context.summary = result.summary;
            break;
            
          case 'payment':
            result = await this.processPayment(command, context);
            results.paymentResult = result;
            break;
            
          case 'update_quantity':
            result = await this.updateQuantity(command, context);
            results.cartItems = result.items;
            break;
            
          case 'customize_item':
            result = await this.customizeItem(command, context);
            results.cartItems = result.items;
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

    results.message = this.generateSummaryMessage(results);
    return results;
  }

  /**
   * Hydrate cart items - ensure all items have full menuItem object
   */
  static async hydrateCartItems(cart) {
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return cart;
    }

    const itemsNeedingHydration = cart.filter(item => {
      const menuItemPrice = item.menuItem?.fullPrice || item.menuItem?.price;
      return typeof item.menuItem === 'string' || 
             !item.menuItem || 
             !item.menuItem.name || 
             !menuItemPrice;
    });

    if (itemsNeedingHydration.length === 0) {
      return cart;
    }

    const menuItemIds = [...new Set(itemsNeedingHydration.map(item => {
      return typeof item.menuItem === 'string' ? item.menuItem : item.menuItem?._id;
    }).filter(Boolean))];

    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } }).lean();
    const menuItemMap = new Map(menuItems.map(item => [item._id.toString(), item]));

    return cart.map(item => {
      const menuItemPrice = item.menuItem?.fullPrice || item.menuItem?.price;
      const needsHydration = typeof item.menuItem === 'string' || 
                           !item.menuItem || 
                           !item.menuItem.name || 
                           !menuItemPrice;
      
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
      
      return item;
    });
  }

  /**
   * Add items to cart - combines duplicates
   */
  static async addToCart(command, context) {
    const items = [];

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

    const menuItemObj = menuItem.toObject ? menuItem.toObject() : menuItem;
    const quantity = command.quantity || 1;
    
    const menuItemIdStr = menuItemObj._id?.toString() || menuItemObj._id;
    const itemSize = command.size || menuItemObj.size || null;
    
    const existingItemIndex = context.cart.findIndex(item => {
      const cartItemMenuItem = item.menuItem;
      const cartItemId = cartItemMenuItem?._id?.toString() || 
                        (typeof cartItemMenuItem === 'string' ? cartItemMenuItem : null);
      const cartItemSize = item.size || cartItemMenuItem?.size || null;
      
      const idMatch = cartItemId === menuItemIdStr;
      const sizeMatch = !itemSize || !cartItemSize || itemSize === cartItemSize;
      
      return idMatch && sizeMatch;
    });
    
    if (existingItemIndex >= 0) {
      context.cart[existingItemIndex].quantity += quantity;
      items.push(context.cart[existingItemIndex]);
      
      return {
        success: true,
        items,
        itemName: menuItem.name,
        quantity: context.cart[existingItemIndex].quantity,
        totalPrice: (menuItem.fullPrice || menuItem.price) * context.cart[existingItemIndex].quantity,
        message: `Updated ${menuItem.name} quantity to ${context.cart[existingItemIndex].quantity} in cart`
      };
    } else {
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
        totalPrice: (menuItem.fullPrice || menuItem.price) * quantity,
        message: `Added ${quantity} x ${menuItem.name} to cart`
      };
    }
  }

  /**
   * Remove item from cart
   */
  static async removeFromCart(command, context) {
    const itemName = command.itemName?.toLowerCase();
    
    const originalLength = context.cart.length;
    context.cart = context.cart.filter(item => {
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
   */
  static async selectAddress(command, context) {
    let address = null;
    let addressSource = '';

    if (command.addressIndex !== undefined) {
      address = await AddressMatcher.selectAddressByIndex(context.userId, command.addressIndex);
      if (address) addressSource = 'saved_address_index';
    }
    
    if (!address && command.addressText) {
      address = await AddressMatcher.matchAddress(context.userId, command.addressText);
      if (address) addressSource = 'voice_input_matched';
    }
    
    if (!address && command.addressText) {
      address = AddressMatcher.extractAddressFromInput(command.addressText);
      if (address) addressSource = 'voice_input_extracted';
    }

    if (!address && context.user?.addresses?.length > 0) {
      address = context.user.addresses[0];
      addressSource = 'user_default';
    }

    if (!address) {
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
        success: true,
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
      return Math.floor(Date.now() / 1000);
    }
  }

  /**
   * Process checkout (summary only - no real order)
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

    let totalAmount = 0;
    
    const orderItems = context.cart.map(item => {
      const itemPrice = item.menuItem?.fullPrice || item.menuItem?.price || item.price || 0;
      const itemTotal = itemPrice * item.quantity;
      totalAmount += itemTotal;
      
      return {
        menuItem: item.menuItem?._id || item.menuItem,
        quantity: item.quantity,
        price: itemPrice,
        name: item.menuItem?.name || 'Unknown'
      };
    });

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

    return {
      success: true,
      summary,
      message: `Checkout ready! Total: ₹${grandTotal.toFixed(2)}. Proceed to checkout page for payment.`
    };
  }

  /**
   * Process payment (BLOCKED for voice - requires checkout page)
   */
  static async processPayment(command, context) {
    return {
      success: false,
      error: 'Payments must be completed manually on the checkout page. Voice ordering cannot process payments.',
      paymentMethod: command.paymentMethod || 'blocked',
      message: 'Redirecting to checkout page for secure online payment (UPI, Card, Net Banking).'
    };
  }

  /**
   * Generate summary message from results
   */
  static generateSummaryMessage(results) {
    const messages = [];

    const addedItems = results.commands
      .filter(c => c.action === 'add_to_cart' && c.success)
      .map(c => c.details?.itemName)
      .filter(Boolean);
    
    if (addedItems.length > 0) {
      messages.push(`Added: ${addedItems.join(', ')}`);
    }

    const removedItems = results.commands
      .filter(c => c.action === 'remove_item' && c.success)
      .map(c => c.details?.removedItem)
      .filter(Boolean);
    
    if (removedItems.length > 0) {
      messages.push(`Removed: ${removedItems.join(', ')}`);
    }

    const addressCmd = results.commands.find(c => c.action === 'select_address' && c.success);
    if (addressCmd) {
      messages.push(`Address: ${addressCmd.details?.formattedAddress}`);
    }

    const checkoutCmd = results.commands.find(c => c.action === 'checkout' && c.success);
    if (checkoutCmd && checkoutCmd.details?.summary) {
      messages.push(`Checkout ready! Total: ₹${checkoutCmd.details.summary.totalAmount.toFixed(2)}`);
    }

    const paymentCmd = results.commands.find(c => c.action === 'payment' && c.success);
    if (paymentCmd) {
      messages.push(paymentCmd.details?.message);
    }

    const errors = results.commands
      .filter(c => !c.success && c.error)
      .map(c => c.error);
    
    if (errors.length > 0) {
      messages.push(`Issues: ${errors.join('; ')}`);
    }

    return messages.join('. ') || 'Processing complete';
  }

  /**
   * Update item quantity in cart
   */
  static async updateQuantity(command, context) {
    const itemName = command.item?.toLowerCase() || command.itemName?.toLowerCase();
    const newQuantity = command.quantity || 1;

    const itemIndex = context.cart.findIndex(item => {
      const cartItemName = item.menuItem?.name?.toLowerCase() || item.itemName?.toLowerCase() || '';
      return cartItemName.includes(itemName);
    });

    if (itemIndex === -1) {
      return {
        success: false,
        error: `Item "${command.item || command.itemName}" not found in cart`,
        items: context.cart
      };
    }

    context.cart[itemIndex].quantity = newQuantity;

    return {
      success: true,
      items: context.cart,
      message: `Updated quantity to ${newQuantity} for ${context.cart[itemIndex].menuItem?.name}`
    };
  }

  /**
   * Customize item in cart (spice/portion)
   */
  static async customizeItem(command, context) {
    const customization = command.customization;
    if (!customization) {
      return {
        success: false,
        error: 'No customization specified',
        items: context.cart
      };
    }

    const targetItemIndex = context.cart.length - 1;
    if (targetItemIndex < 0) {
      return {
        success: false,
        error: 'Cart is empty',
        items: context.cart
      };
    }

    const item = context.cart[targetItemIndex];
    item.customization = { ...item.customization, ...customization };

    return {
      success: true,
      items: context.cart,
      message: `Applied customization: ${JSON.stringify(customization)} to ${item.menuItem?.name}`
    };
  }
}

module.exports = CommandExecutor;

