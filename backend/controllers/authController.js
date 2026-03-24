const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');

const generateToken = (id, role, name, email) => {
  return jwt.sign({ id, role, name, email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const register = async (req, res) => {
  console.log('REGISTER: Starting registration for email:', req.body.email);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('REGISTER: Validation failed:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role } = req.body;
  const normalizedRole = role ? role.toUpperCase() : 'CUSTOMER';
  console.log('REGISTER: Normalized role:', normalizedRole);

  try {
    console.log('REGISTER: Checking if user exists...');
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('REGISTER: User already exists');
      return res.status(400).json({ message: 'User already exists' });
    }

    // SUPER_ADMIN registration logic
    if (normalizedRole === 'SUPER_ADMIN') {
      console.log('REGISTER: Checking SUPER_ADMIN count...');
      const superAdminCount = await User.countDocuments({ role: 'SUPER_ADMIN' });
      if (superAdminCount > 0) {
        console.log('REGISTER: SUPER_ADMIN already exists');
        return res.status(403).json({ message: 'SUPER_ADMIN already exists. Only one allowed.' });
      }
    } else if (!['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'].includes(normalizedRole)) {
      console.log('REGISTER: Invalid role');
      return res.status(400).json({ message: 'Invalid role. Must be CUSTOMER, ADMIN, or SUPER_ADMIN.' });
    }

    console.log('REGISTER: Creating user...');
    const user = await User.create({
      name,
      email,
      password,
      role: normalizedRole,
    });

    console.log('REGISTER: User created successfully, ID:', user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role, user.name, user.email),
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      if (error.keyPattern?.role) {
        return res.status(403).json({ message: 'Only one SUPER_ADMIN allowed.' });
      }
    }
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  console.log('LOGIN: Attempt for email:', req.body.email);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('LOGIN: Validation failed:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('LOGIN: User not found');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (isMatch) {
      console.log('LOGIN: Success for user:', user._id);
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role, user.name, user.email),
      });
    } else {
      console.log('LOGIN: Password mismatch');
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      addresses: user.addresses,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      if (req.body.addresses !== undefined) {
        user.addresses = req.body.addresses;
      }
      if (req.body.password) {
        user.password = req.body.password;
        user.markModified('password');
      }
      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        addresses: updatedUser.addresses,
        token: generateToken(updatedUser._id, updatedUser.role, updatedUser.name, updatedUser.email),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      const newAddress = req.body;
      user.addresses.push(newAddress);
      const updatedUser = await user.save();
      res.json({
        addresses: updatedUser.addresses,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      const index = parseInt(req.params.index);
      if (index >= 0 && index < user.addresses.length) {
        user.addresses.splice(index, 1);
        const updatedUser = await user.save();
        res.json({
          addresses: updatedUser.addresses,
        });
      } else {
        res.status(400).json({ message: 'Invalid address index' });
      }
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getProfile, updateProfile, addAddress, removeAddress };
