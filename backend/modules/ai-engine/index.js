/**
 * AI Engine - Main Processor
 * Integrates all AI modules for voice command processing
 */

const IntentDetector = require('./intentDetector');
const MenuFetcher = require('./menuFetcher');
const AddressMatcher = require('./addressMatcher');
const CommandExecutor = require('./commandExecutor');
const AIEngineLogger = require('./logger');
const User = require('../../models/User');

class AIEngine {
  /**
   * Process voice command and execute actions
   * @param {string} voiceInput - Raw voice input text
   * @param {string} userId - User ID
   * @param {Object} options - Additional options
   * @returns {Object} - Processing result
   */
  static async process(voiceInput, userId, options = {}) {
    const startTime = Date.now();
    let logId = null;
    
    try {
      // Validate input
      if (!voiceInput || typeof voiceInput !== 'string') {
        return {
          success: false,
          message: 'Please provide a valid voice command',
          intents: [],
          commands: []
        };
      }

      // Sanitize input
      const sanitizedInput = this.sanitizeInput(voiceInput);
      
      if (!sanitizedInput) {
        return {
          success: false,
          message: 'Invalid voice input. Please try again.',
          intents: [],
          commands: []
        };
      }

      // Get user context
      const user = await User.findById(userId).lean();
      if (!user) {
        return {
          success: false,
          message: 'User not found. Please login again.',
          intents: [],
          commands: []
        };
      }

      // Get current cart from context (passed in options or initialize empty)
      const cart = options.cart || [];

      // Create execution context
      const context = {
        userId,
        user,
        cart: [...cart],
        selectedAddress: options.selectedAddress || null,
        order: null
      };

      // Detect intents
      const { intents, entities } = IntentDetector.detectIntents(sanitizedInput);

      if (intents.length === 0) {
        // Create initial log
        const logEntry = await AIEngineLogger.createLog({
          userId,
          voiceInput: sanitizedInput,
          intents: [],
          commands: [],
          status: 'failed',
          processingTime: Date.now() - startTime
        });
        logId = logEntry?._id;

        return {
          success: false,
          message: "Sorry, I didn't understand that. Please try commands like 'order pizza' or 'show menu'.",
          intents: [],
          entities,
          commands: []
        };
      }

      // Get execution order
      const orderedIntents = IntentDetector.getExecutionOrder(intents);

      // Build commands from intents and entities
      const commands = this.buildCommands(orderedIntents, entities, context);

      // Create log entry
      const logEntry = await AIEngineLogger.createLog({
        userId,
        voiceInput: sanitizedInput,
        intents: orderedIntents.map(i => i.intent),
        commands,
        cartItems: cart,
        status: 'processing',
        processingTime: 0,
        browserInfo: options.browserInfo || 'Unknown'
      });
      logId = logEntry?._id;

      // Execute commands
      const executionResults = await CommandExecutor.executeCommands(commands, context);

      // Update log with results
      await AIEngineLogger.updateLog(logId, {
        commands: executionResults.commands,
        cartItems: context.cart,
        selectedAddress: context.selectedAddress,
        orderId: context.order?._id,
        response: {
          message: executionResults.message,
          success: executionResults.success,
          orderTotal: context.order?.totalAmount
        },
        status: executionResults.success ? 'completed' : 'failed',
        processingTime: Date.now() - startTime
      });

      return {
        success: executionResults.success,
        message: executionResults.message,
        intents: orderedIntents.map(i => i.intent),
        entities,
        commands: executionResults.commands,
        cartItems: context.cart,
        selectedAddress: context.selectedAddress,
        order: context.order,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('AI Engine Error:', error);

      // Update log with error
      if (logId) {
        await AIEngineLogger.updateLog(logId, {
          status: 'failed',
          response: {
            message: error.message,
            success: false
          },
          processingTime: Date.now() - startTime
        });
      }

      return {
        success: false,
        message: 'An error occurred while processing your request. Please try again.',
        error: error.message,
        intents: [],
        commands: []
      };
    }
  }

  /**
   * Get menu items for voice display
   * @param {string} category - Optional category filter
   * @returns {Array} - Menu items
   */
  static async getMenu(category = null) {
    try {
      let items;
      
      if (category) {
        items = await MenuFetcher.getMenuByCategory(category);
      } else {
        items = await MenuFetcher.getAllMenuItems();
      }

      return {
        success: true,
        items: items.map(item => ({
          _id: item._id,
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category?.name,
          isAvailable: item.isAvailable
        })),
        count: items.length
      };
    } catch (error) {
      console.error('Get Menu Error:', error);
      return {
        success: false,
        items: [],
        message: 'Failed to fetch menu'
      };
    }
  }

  /**
   * Get user addresses for voice
   * @param {string} userId - User ID
   * @returns {Array} - User addresses
   */
  static async getUserAddresses(userId) {
    try {
      const addresses = await AddressMatcher.getUserAddresses(userId);
      return {
        success: true,
        addresses,
        count: addresses.length
      };
    } catch (error) {
      console.error('Get User Addresses Error:', error);
      return {
        success: false,
        addresses: [],
        message: 'Failed to fetch addresses'
      };
    }
  }

  /**
   * Build commands from detected intents and entities
   * @param {Array} intents - Detected intents
   * @param {Object} entities - Extracted entities
   * @param {Object} context - Execution context
   * @returns {Array} - Commands to execute
   */
  static buildCommands(intents, entities, context) {
    const commands = [];

    for (const intent of intents) {
      const command = { action: intent.intent };

      switch (intent.intent) {
        case 'add_to_cart':
          if (entities.items.length > 0) {
            // Handle multiple items in the voice command
            // If we have multiple items, create separate commands for each
            if (entities.items.length > 1) {
              // Multiple items - create one command per item
              for (let i = 0; i < entities.items.length; i++) {
                const itemCommand = {
                  action: 'add_to_cart',
                  itemName: entities.items[i],
                  quantity: entities.quantities[i] || entities.quantities[0] || 1,
                  size: entities.sizes[i] || entities.sizes[0] || null
                };
                commands.push(itemCommand);
              }
            } else {
              // Single item - use original behavior
              command.itemName = entities.items[0];
              command.quantity = entities.quantities[0] || 1;
              command.size = entities.sizes[0] || null;
              commands.push(command);
            }
          }
          break;

        case 'remove_item':
          if (entities.items.length > 0) {
            command.itemName = entities.items[0];
            commands.push(command);
          }
          break;

        case 'select_address':
          if (entities.addresses.length > 0) {
            command.addressText = entities.addresses[0].text || entities.addresses[0].zipCode;
            command.addressIndex = entities.addresses[0].index;
          }
          commands.push(command);
          break;

        case 'checkout':
          // Checkout doesn't need extra data
          commands.push(command);
          break;

        case 'payment':
          if (entities.paymentMethod) {
            command.paymentMethod = entities.paymentMethod;
          }
          commands.push(command);
          break;

        case 'get_menu':
          // Get menu doesn't create a command to execute
          // It's handled separately
          break;
      }
    }

    return commands;
  }

  /**
   * Sanitize voice input
   * @param {string} input - Raw input
   * @returns {string} - Sanitized input
   */
  static sanitizeInput(input) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML
      .replace(/javascript:/gi, '') // Remove JS injection
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 500); // Limit length
  }

  /**
   * Get AI command history for user
   * @param {string} userId - User ID
   * @param {number} limit - Number of entries
   * @returns {Array} - Command history
   */
  static async getUserHistory(userId, limit = 10) {
    return await AIEngineLogger.getUserHistory(userId, limit);
  }

  /**
   * Get AI engine statistics (admin)
   * @returns {Object} - Statistics
   */
  static async getStats() {
    return await AIEngineLogger.getStats();
  }
}

module.exports = AIEngine;
