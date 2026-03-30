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

module.exports = {
  getTables,
  getTable,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
};

