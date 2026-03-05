const Inventory = require('../models/Inventory');

const getInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find({});
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteInventory = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    await inventory.deleteOne();
    res.json({ message: 'Inventory item removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateInventory = async (req, res) => {
  try {
    const inventoryData = req.body;
    if (Array.isArray(inventoryData)) {
      // Handle bulk update
      const updatedItems = [];
      for (const item of inventoryData) {
        const { itemName, quantity, unit, isActive, minStockLevel } = item;
        let inventoryItem = await Inventory.findOne({ itemName });
        if (inventoryItem) {
          inventoryItem.quantity = quantity;
          inventoryItem.unit = unit;
          // Default isActive to true if not provided
          inventoryItem.isActive = isActive !== undefined ? isActive : true;
          if (minStockLevel !== undefined) {
            inventoryItem.minStockLevel = minStockLevel;
          }
          await inventoryItem.save();
        } else {
          inventoryItem = new Inventory({
            ...item,
            isActive: isActive !== undefined ? isActive : true
          });
          await inventoryItem.save();
        }
        updatedItems.push(inventoryItem);
      }
      res.json(updatedItems);
    } else {
      // Handle single item update
      const { itemName, quantity, unit, isActive, minStockLevel } = inventoryData;
      let inventoryItem = await Inventory.findOne({ itemName });
      if (inventoryItem) {
        inventoryItem.quantity = quantity;
        inventoryItem.unit = unit;
        // Default isActive to true if not provided
        inventoryItem.isActive = isActive !== undefined ? isActive : true;
        if (minStockLevel !== undefined) {
          inventoryItem.minStockLevel = minStockLevel;
        }
        await inventoryItem.save();
      } else {
        inventoryItem = new Inventory({
          ...inventoryData,
          isActive: isActive !== undefined ? isActive : true
        });
        await inventoryItem.save();
      }
      res.json(inventoryItem);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deductStock = async (items) => {
  for (const item of items) {
    const menuItem = await require('../models/MenuItem').findById(item.menuItem);
    if (!menuItem) continue;

    let inventoryItem;
    if (menuItem.category === 'Biryani') {
      inventoryItem = await Inventory.findOne({ itemName: 'Rice' });
      if (inventoryItem) {
        inventoryItem.quantity -= item.quantity * 0.5; // Assuming 0.5kg rice per biryani
        await inventoryItem.save();
      }
    } else if (menuItem.category === 'Korma' && menuItem.name.includes('Chicken')) {
      inventoryItem = await Inventory.findOne({ itemName: 'Chicken' });
      if (inventoryItem) {
        inventoryItem.quantity -= item.quantity * 0.3; // Assuming 0.3kg chicken per korma
        await inventoryItem.save();
      }
    } else if (menuItem.category === 'Korma' && menuItem.name.includes('Mutton')) {
      inventoryItem = await Inventory.findOne({ itemName: 'Mutton' });
      if (inventoryItem) {
        inventoryItem.quantity -= item.quantity * 0.3; // Assuming 0.3kg mutton per korma
        await inventoryItem.save();
      }
    } else if (menuItem.category === 'Tandoori') {
      inventoryItem = await Inventory.findOne({ itemName: 'Chicken' });
      if (inventoryItem) {
        inventoryItem.quantity -= item.quantity * 0.5; // Assuming 0.5kg chicken per tandoori
        await inventoryItem.save();
      }
    }
  }
};

const checkStockAvailability = async (items) => {
  for (const item of items) {
    const menuItem = await require('../models/MenuItem').findById(item.menuItem);
    if (!menuItem) return false;

    let requiredQuantity = 0;
    if (menuItem.category === 'Biryani') {
      requiredQuantity = item.quantity * 0.5;
      const inventoryItem = await Inventory.findOne({ itemName: 'Rice' });
      if (!inventoryItem || inventoryItem.quantity < requiredQuantity) return false;
    } else if (menuItem.category === 'Korma' && menuItem.name.includes('Chicken')) {
      requiredQuantity = item.quantity * 0.3;
      const inventoryItem = await Inventory.findOne({ itemName: 'Chicken' });
      if (!inventoryItem || inventoryItem.quantity < requiredQuantity) return false;
    } else if (menuItem.category === 'Korma' && menuItem.name.includes('Mutton')) {
      requiredQuantity = item.quantity * 0.3;
      const inventoryItem = await Inventory.findOne({ itemName: 'Mutton' });
      if (!inventoryItem || inventoryItem.quantity < requiredQuantity) return false;
    } else if (menuItem.category === 'Tandoori') {
      requiredQuantity = item.quantity * 0.5;
      const inventoryItem = await Inventory.findOne({ itemName: 'Chicken' });
      if (!inventoryItem || inventoryItem.quantity < requiredQuantity) return false;
    }
  }
  return true;
};

// Restore stock when order is cancelled (reverse of deductStock)
const restoreStock = async (items) => {
  for (const item of items) {
    const menuItem = await require('../models/MenuItem').findById(item.menuItem);
    if (!menuItem) continue;

    let restoreQuantity = 0;
    if (menuItem.category === 'Biryani') {
      restoreQuantity = item.quantity * 0.5;
      const inventoryItem = await Inventory.findOne({ itemName: 'Rice' });
      if (inventoryItem) {
        inventoryItem.quantity += restoreQuantity;
        await inventoryItem.save();
      }
    } else if (menuItem.category === 'Korma' && menuItem.name.includes('Chicken')) {
      restoreQuantity = item.quantity * 0.3;
      const inventoryItem = await Inventory.findOne({ itemName: 'Chicken' });
      if (inventoryItem) {
        inventoryItem.quantity += restoreQuantity;
        await inventoryItem.save();
      }
    } else if (menuItem.category === 'Korma' && menuItem.name.includes('Mutton')) {
      restoreQuantity = item.quantity * 0.3;
      const inventoryItem = await Inventory.findOne({ itemName: 'Mutton' });
      if (inventoryItem) {
        inventoryItem.quantity += restoreQuantity;
        await inventoryItem.save();
      }
    } else if (menuItem.category === 'Tandoori') {
      restoreQuantity = item.quantity * 0.5;
      const inventoryItem = await Inventory.findOne({ itemName: 'Chicken' });
      if (inventoryItem) {
        inventoryItem.quantity += restoreQuantity;
        await inventoryItem.save();
      }
    }
  }
};

module.exports = { getInventory, deleteInventory, updateInventory, deductStock, checkStockAvailability, restoreStock };
