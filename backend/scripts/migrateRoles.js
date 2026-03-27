const mongoose = require('mongoose');
const User = require('../models/User');

const migrateRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cloud-kitchen');
    console.log('✅ Connected to MongoDB');

    // Update customer -> CUSTOMER
    const customerResults = await User.updateMany(
      { role: 'customer' }, 
      { role: 'CUSTOMER' }
    );
    console.log(`Updated ${customerResults.modifiedCount} 'customer' -> 'CUSTOMER'`);

    // Update admin -> ADMIN  
    const adminResults = await User.updateMany(
      { role: 'admin' }, 
      { role: 'ADMIN' }
    );
    console.log(`Updated ${adminResults.modifiedCount} 'admin' -> 'ADMIN'`);

    const totalUpdated = customerResults.modifiedCount + adminResults.modifiedCount;
    console.log(`✅ Migration complete: Updated ${totalUpdated} user roles`);
    
    // Verify
    const users = await User.find({}).select('role');
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    console.log('Current role distribution:', roleCounts);
    
    if (Object.keys(roleCounts).length > 3 || Object.keys(roleCounts).some(role => !['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'].includes(role))) {
      console.log('⚠️  Some roles may still be invalid');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateRoles();

