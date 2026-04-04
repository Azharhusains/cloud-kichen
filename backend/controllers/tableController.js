const Table = require('../models/Table');

const getTables = async (req, res) => {
  try {
    const kitchenId = req.kitchen?._id || req.user?.currentKitchen;
    const tables = await Table.find({ kitchenId, isActive: true }).populate('createdBy updatedBy', 'name').sort({ tableNumber: 1 });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTable = async (req, res) => {
  try {
    const kitchenId = req.kitchen?._id || req.user?.currentKitchen;
    const table = await Table.findOne({ tableNumber: req.params.tableNumber, kitchenId, isActive: true });
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
    const { tableNumber, capacity, location, kitchenId: bodyKitchenId } = req.body;
    const kitchenId = bodyKitchenId || req.kitchen?._id || req.user?.currentKitchen;
    
    if (!kitchenId) {
      return res.status(400).json({ message: 'Kitchen ID is required' });
    }
    
    // Check if table number already exists for this kitchen
    const existingTable = await Table.findOne({ tableNumber, kitchenId });
    if (existingTable) {
      return res.status(400).json({ message: 'Table number already exists for this kitchen' });
    }

    const table = new Table({
      tableNumber,
      capacity: capacity || 4,
      location,
      kitchenId,
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
    const kitchenId = req.kitchen?._id || req.user?.currentKitchen;
    const table = await Table.findOne({ _id: req.params.id, kitchenId });
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    const { tableNumber, capacity, status, location } = req.body;
    const oldStatus = table.status;
    
    if (tableNumber && tableNumber !== table.tableNumber) {
      const existingTable = await Table.findOne({ tableNumber, kitchenId, _id: { $ne: table._id } });
      if (existingTable) {
        return res.status(400).json({ message: 'Table number already exists for this kitchen' });
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
    const kitchenId = req.kitchen?._id || req.user?.currentKitchen;
    const table = await Table.findOne({ _id: req.params.id, kitchenId });
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
    const kitchenId = req.kitchen?._id || req.user?.currentKitchen;
    const table = await Table.findOne({ tableNumber: req.params.tableNumber, kitchenId });
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

