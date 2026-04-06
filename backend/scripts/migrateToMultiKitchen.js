const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Kitchen = require('../models/Kitchen');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Inventory = require('../models/Inventory');
const Table = require('../models/Table');

connectDB();

const migrate = async () => {
  try {
    console.log('🔄 Starting Multi-Kitchen migration...');

    // Step 1: Create default kitchen for existing data
    const defaultKitchen = await Kitchen.create({
      name: 'Default Cloud Kitchen',
      ownerId: null, // System kitchen
      locations: [],
      subscriptionPlan: 'FREE',
      status: 'active'
    });

    console.log('✅ Default kitchen created:', defaultKitchen._id);

    // Step 2: Create FREE subscription
    await Subscription.create({
      kitchenId: defaultKitchen._id,
      plan: 'FREE'
    });
    console.log('✅ Default subscription created');

    // Step 3: Update all documents with kitchenId
    const updates = await Promise.all([
      Order.updateMany({ kitchenId: { $exists: false } }, { kitchenId: defaultKitchen._id }),
      MenuItem.updateMany({ kitchenId: { $exists: false } }, { kitchenId: defaultKitchen._id }),
      Category.updateMany({ kitchenId: { $exists: false } }, { kitchenId: defaultKitchen._id }),
      Inventory.updateMany({ kitchenId: { $exists: false } }, { kitchenId: defaultKitchen._id }),
      Table.updateMany({ kitchenId: { $exists: false } }, { kitchenId: defaultKitchen._id })
    ]);

    console.log('✅ Updated documents:', updates.map(u => ({ model: u.model, modified: u.modifiedCount })));

    // Step 4: Find first admin/super admin and set as owner
    const adminUser = await User.findOne({ role: { $in: ['SUPER_ADMIN', 'ADMIN'] } });
    if (adminUser) {
      defaultKitchen.ownerId = adminUser._id;
      defaultKitchen.name = `${adminUser.name}'s Cloud Kitchen`;
      await defaultKitchen.save();
      adminUser.ownedKitchens = [defaultKitchen._id];
      adminUser.currentKitchen = defaultKitchen._id;
      await adminUser.save();
      console.log('✅ Set admin as default kitchen owner:', adminUser.email);
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
