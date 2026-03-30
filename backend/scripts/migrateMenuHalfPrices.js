const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const dbConfig = require('../config/database');

async function migrateMenuItems() {
  try {
    // Connect to database
    await mongoose.connect(dbConfig.url);
    console.log('Connected to database');

    // Find all menu items (they'll have 'price' field, no fullPrice)
    const itemsToMigrate = await MenuItem.find({ fullPrice: { $exists: false } });
    console.log(`Found ${itemsToMigrate.length} items to migrate`);

    let updatedCount = 0;
    for (const item of itemsToMigrate) {
      // Migrate: price → fullPrice, supportsHalf=false, halfPrice=null
      item.fullPrice = item.price;
      item.supportsHalf = false;
      item.halfPrice = null;
      
      await item.save();
      updatedCount++;
      console.log(`Migrated: ${item.name}`);
    }

    console.log(`Migration completed successfully! Updated ${updatedCount} items.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrateMenuItems();

