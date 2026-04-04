const IntentDetector = require('../modules/ai-engine/intentDetector');
const CommandExecutor = require('../modules/ai-engine/commandExecutor');
const VoiceSession = require('../models/VoiceSession');
const MenuItem = require('../models/MenuItem');
const crypto = require('crypto');

class VoiceService {
  /**
   * Generate unique session ID
   */
  static generateSessionId(userId) {
    const hash = crypto.createHash('sha256');
    hash.update(userId + Date.now().toString() + Math.random());
    return hash.digest('hex').slice(0, 32);
  }

  /**
   * Parse voice input to structured JSON (multi-intent + customizations)
   * @param {string} voiceInput
   * @returns {Array} commands
   */
  static parseVoiceCommand(voiceInput) {
    const detection = IntentDetector.detectIntents(voiceInput);
    const commands = [];

    detection.intents.forEach(intent => {
      if (intent.intent === 'add_to_cart' || intent.intent === 'update_quantity') {
        // Extract primary item, quantity, size, customizations
        const item = this.extractPrimaryItem(voiceInput, detection.entities.items);
        const quantity = detection.entities.quantities[0] || 1;
        const size = detection.entities.sizes[0];
        const customizations = this.extractCustomizations(voiceInput);

        commands.push({
          action: 'add_item',
          item: item,
          quantity,
          size,
          customization: customizations
        });
      } else if (intent.intent === 'remove_item') {
        const item = this.extractPrimaryItem(voiceInput);
        commands.push({
          action: 'remove_item',
          item
        });
      } else if (intent.intent === 'customize_item') {
        commands.push({
          action: 'customize_item',
          customization: this.extractCustomizations(voiceInput)
        });
      }
    });

    return commands;
  }

  /**
   * Extract primary item name
   */
  static extractPrimaryItem(voiceInput, items = []) {
    // Compound items first (chicken biryani etc.)
    const compoundPriority = [
      'chicken biryani', 'mutton biryani', 'veg biryani', 'egg biryani',
      'chicken pizza', 'margherita pizza', 'butter chicken'
    ];
    for (const item of compoundPriority) {
      if (voiceInput.toLowerCase().includes(item)) return item;
    }
    return items[0] || 'unknown';
  }

  /**
   * Extract customizations (spice, portion)
   */
  static extractCustomizations(voiceInput) {
    const lowerInput = voiceInput.toLowerCase();
    const custom = {};

    // Spice levels
    if (lowerInput.includes('less') || lowerInput.includes('low') || lowerInput.includes('mild')) {
      custom.spice = 'low';
    } else if (lowerInput.includes('medium') || lowerInput.includes('normal')) {
      custom.spice = 'medium';
    } else if (lowerInput.includes('spicy') || lowerInput.includes('hot') || lowerInput.includes('high')) {
      custom.spice = 'high';
    }

    // Portion (extends existing half/full)
    if (lowerInput.includes('half')) {
      custom.portion = 'half';
    } else if (lowerInput.includes('full')) {
      custom.portion = 'full';
    }

    return Object.keys(custom).length ? custom : null;
  }

  /**
   * Process full voice command with session
   */
  static async processVoice(voiceInput, userId, sessionId = null) {
    try {
      // Ensure session
      if (!sessionId) {
        sessionId = this.generateSessionId(userId);
      }
      let session = await VoiceSession.getSession(userId, sessionId);

      // Parse command
      const structuredCommands = this.parseVoiceCommand(voiceInput);
      session.lastCommand = voiceInput;
      session.currentIntent = structuredCommands[0]?.action || 'idle';

      // Build execution context
      const context = {
        userId,
        cart: session.cartState || [],
        user: { _id: userId } // Minimal user stub
      };

      // Execute commands (extend CommandExecutor)
      const results = await CommandExecutor.executeCommands(structuredCommands, context);

      // Apply customizations to cart
      await this.applyCustomizationsToCart(context.cart);

      // Update session
      session = await VoiceSession.updateCart(sessionId, context.cart, voiceInput);

      return {
        success: results.success,
        sessionId,
        commands: structuredCommands,
        cartItems: context.cart,
        message: results.message || 'Command processed',
        currentIntent: session.currentIntent
      };
    } catch (error) {
      console.error('Voice processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Apply customizations to cart items (price adjustment etc.)
   */
  static async applyCustomizationsToCart(cart) {
    for (let item of cart) {
      if (item.customization) {
        const menuItem = await MenuItem.findById(item.menuItem);
        if (!menuItem) continue;

        let price = menuItem.fullPrice || menuItem.price;
        if (item.customization.portion === 'half' && menuItem.halfPrice) {
          price = menuItem.halfPrice;
        }
        // Spice doesn't affect price

        item.price = price;
        item.customization = item.customization;
      }
    }
  }
}

module.exports = VoiceService;
