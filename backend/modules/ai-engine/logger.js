/**
 * AI Engine Logger Module
 * Logs all voice commands and AI processing for audit and debugging
 */

const AILogger = require('../../models/AILogger');

class AIEngineLogger {
  /**
   * Create a new AI log entry
   * @param {Object} logData - Data to log
   * @returns {Promise<Object>} - Created log entry
   */
  static async createLog(logData) {
    try {
      const logEntry = new AILogger({
        user: logData.userId,
        voiceInput: logData.voiceInput,
        intents: logData.intents || [],
        commands: logData.commands || [],
        selectedAddress: logData.selectedAddress,
        cartItems: logData.cartItems || [],
        orderId: logData.orderId,
        response: logData.response,
        processingTime: logData.processingTime || 0,
        browserInfo: logData.browserInfo || 'Unknown',
        status: logData.status || 'pending'
      });
      
      return await logEntry.save();
    } catch (error) {
      console.error('AI Logger Error:', error);
      // Don't throw - logging should not break the main flow
      return null;
    }
  }

  /**
   * Update log entry with command results
   * @param {string} logId - Log entry ID
   * @param {Object} updateData - Data to update
   */
  static async updateLog(logId, updateData) {
    try {
      return await AILogger.findByIdAndUpdate(
        logId,
        { $set: updateData },
        { new: true }
      );
    } catch (error) {
      console.error('AI Logger Update Error:', error);
      return null;
    }
  }

  /**
   * Log a single command execution
   * @param {string} logId - Log entry ID
   * @param {Object} command - Command to log
   */
  static async logCommand(logId, command) {
    try {
      return await AILogger.findByIdAndUpdate(
        logId,
        { $push: { commands: command } },
        { new: true }
      );
    } catch (error) {
      console.error('AI Command Log Error:', error);
      return null;
    }
  }

  /**
   * Get user's AI command history
   * @param {string} userId - User ID
   * @param {number} limit - Number of entries to retrieve
   * @returns {Promise<Array>} - User's AI command history
   */
  static async getUserHistory(userId, limit = 10) {
    try {
      return await AILogger.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('orderId')
        .populate('cartItems.menuItem');
    } catch (error) {
      console.error('AI History Error:', error);
      return [];
    }
  }

  /**
   * Get all AI logs (admin)
   * @param {Object} filters - Query filters
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} - Paginated logs
   */
  static async getAllLogs(filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const logs = await AILogger.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .populate('orderId')
        .populate('cartItems.menuItem');
      
      const total = await AILogger.countDocuments(filters);
      
      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('AI Logs Fetch Error:', error);
      return { logs: [], pagination: { page, limit, total: 0, pages: 0 } };
    }
  }

  /**
   * Get AI engine statistics
   * @returns {Promise<Object>} - Statistics
   */
  static async getStats() {
    try {
      const totalCommands = await AILogger.countDocuments();
      const successfulCommands = await AILogger.countDocuments({ status: 'completed' });
      const failedCommands = await AILogger.countDocuments({ status: 'failed' });
      
      const avgProcessingTime = await AILogger.aggregate([
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$processingTime' }
          }
        }
      ]);
      
      return {
        totalCommands,
        successfulCommands,
        failedCommands,
        successRate: totalCommands > 0 ? ((successfulCommands / totalCommands) * 100).toFixed(2) : 0,
        averageProcessingTime: avgProcessingTime[0]?.avgTime?.toFixed(2) || 0
      };
    } catch (error) {
      console.error('AI Stats Error:', error);
      return {
        totalCommands: 0,
        successfulCommands: 0,
        failedCommands: 0,
        successRate: 0,
        averageProcessingTime: 0
      };
    }
  }
}

module.exports = AIEngineLogger;
