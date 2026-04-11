const Table = require('../models/Table');

const getTables = async (req, res) => {
  try {
    const tables = await Table.find({}).populate('createdBy updatedBy', 'name').sort({ tableNumber: 1 });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTable = async (req, res) => {
  try {
    const table = await Table.findOne({ tableNumber: req.params.tableNumber, isActive: true });
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    res.json(table);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createTable = async (req, res) => {
  try {
    const { tableNumber, capacity, location } = req.body;
    
    // Check if table number already exists
    const existingTable = await Table.findOne({ tableNumber });
    if (existingTable) {
      return res.status(400).json({ message: 'Table number already exists' });
    }

    const table = new Table({
      tableNumber,
      capacity: capacity || 4,
      location,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    const createdTable = await table.save();
    res.status(201).json(createdTable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTable = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    const { tableNumber, capacity, status, location } = req.body;
    const oldStatus = table.status;
    
    if (tableNumber && tableNumber !== table.tableNumber) {
      const existingTable = await Table.findOne({ tableNumber, _id: { $ne: table._id } });
      if (existingTable) {
        return res.status(400).json({ message: 'Table number already exists' });
      }
      table.tableNumber = tableNumber;
    }
    
    if (capacity) table.capacity = capacity;
    if (status) table.status = status;
    if (location) table.location = location;
    table.updatedBy = req.user._id;

    const updatedTable = await table.save();

    // Emit Socket.IO event if status changed
    if (status && status !== oldStatus) {
      const io = req.app.get('io');
      io.to('adminRoom').emit('tableStatusChanged', updatedTable);
      io.emit('tableStatusBroadcast', updatedTable);
      console.log(`Table ${updatedTable.tableNumber} status changed: ${oldStatus} -> ${status}`);
    }

    res.json(updatedTable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTable = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    // Soft delete - set isActive to false
    table.isActive = false;
    await table.save();

    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTableStatus = async (req, res) => {
  try {
    const table = await Table.findOne({ tableNumber: req.params.tableNumber });
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    const { status } = req.body;
    const oldStatus = table.status;
    table.status = status;
    const updatedTable = await table.save();

    // Emit Socket.IO event for status change
    const io = req.app.get('io');
    io.to('adminRoom').emit('tableStatusChanged', updatedTable);
    io.emit('tableStatusBroadcast', updatedTable);
    console.log(`Table ${updatedTable.tableNumber} status changed: ${oldStatus} -> ${status}`);

    res.json(updatedTable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const lockTable = async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const userId = req.user._id;

    // Atomic update: only lock if available
    const updatedTable = await Table.findOneAndUpdate(
      { 
        tableNumber, 
        status: 'available',
        isActive: true 
      },
      { 
        status: 'locked',
        lockedBy: userId,
        lockExpiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
        updatedBy: userId
      },
      { 
        new: true,
        runValidators: true 
      }
    );

    if (!updatedTable) {
      // Table not available or not found
      const table = await Table.findOne({ tableNumber });
      if (!table) {
        return res.status(404).json({ message: 'Table not found' });
      }
      if (table.status === 'locked') {
        return res.status(409).json({ 
          message: 'Table already locked',
          expiresAt: table.lockExpiresAt 
        });
      }
      return res.status(409).json({ message: 'Table not available' });
    }

    // Emit socket event
    const io = req.app.get('io');
    io.emit('table_locked', {
      tableId: updatedTable._id,
      tableNumber: updatedTable.tableNumber,
      lockedBy: userId,
      lockExpiresAt: updatedTable.lockExpiresAt
    });
    io.to('adminRoom').emit('tableStatusChanged', updatedTable);

    console.log(`Table ${tableNumber} locked by user ${userId} until ${updatedTable.lockExpiresAt}`);

    res.json({
      success: true,
      table: updatedTable
    });
  } catch (error) {
    console.error('Lock table error:', error);
    res.status(500).json({ message: error.message });
  }
};

const unlockTable = async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const userId = req.user._id;

    const table = await Table.findOne({ tableNumber, isActive: true });
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    const now = new Date();
    const canUnlock = table.lockedBy?.toString() === userId.toString() || 
                      (table.lockExpiresAt && table.lockExpiresAt <= now);

    if (!canUnlock) {
      return res.status(409).json({ 
        message: 'Cannot unlock this table - not your lock or still active' 
      });
    }

    table.status = 'available';
    table.lockedBy = null;
    table.lockExpiresAt = null;
    table.updatedBy = userId;
    const updatedTable = await table.save();

    const io = req.app.get('io');
    io.emit('table_unlocked', {
      tableId: updatedTable._id,
      tableNumber: updatedTable.tableNumber
    });
    io.to('adminRoom').emit('tableStatusChanged', updatedTable);
    io.emit('tableStatusBroadcast', updatedTable);

    console.log(`Table ${tableNumber} unlocked by user ${userId}`);

    res.json({
      success: true,
      table: updatedTable
    });
  } catch (error) {
    console.error('Unlock table error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTables,
  getTable,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  lockTable,
  unlockTable
};


