const jwt = require('jsonwebtoken');
// const { validationResult } = require('express-validator'); // Replaced by Joi
const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');

const generateToken = (id, role, name, email) => {
  return jwt.sign({ id, role, name, email }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const register = require('../middleware/errorHandler').asyncHandler(async (req, res) => {
  const { name, email, password, role: requestedRole } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check Super Admin count
    const superAdminCount = await User.countDocuments({ role: 'SUPER_ADMIN' });
    
    let finalRole;
    if (superAdminCount === 0 && requestedRole === 'SUPER_ADMIN') {
      // Allow first Super Admin creation
      finalRole = 'SUPER_ADMIN';
    } else {
      // Force CUSTOMER for all others (security)
      finalRole = 'CUSTOMER';
    }

    const user = await User.create({
      name,
      email,
      password,
      role: finalRole,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role, user.name, user.email),
    });
  } catch (error) {
    throw error; // Pass to centralized error handler
  }
});

const login = require('../middleware/errorHandler').asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is locked
    // const loginAttempt = await LoginAttempt.findOne({ userId: user._id });
    // if (loginAttempt && loginAttempt.lockedUntil && loginAttempt.lockedUntil > Date.now()) {
    //   return res.status(423).json({ message: 'Account is locked due to too many failed login attempts. Try again later.' });
    // }

    if (await user.comparePassword(password)) {
      // Successful login: reset attempts
      // if (loginAttempt) {
      //   loginAttempt.attempts = 0;
      //   loginAttempt.lockedUntil = null;
      //   await loginAttempt.save();
      // }
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role, user.name, user.email),
      });
    } else {
      // Failed login: increment attempts
      // if (!loginAttempt) {
      //   const newAttempt = new LoginAttempt({ userId: user._id, attempts: 1 });
      //   await newAttempt.save();
      // } else {
      //   loginAttempt.attempts += 1;
      //   loginAttempt.lastAttempt = Date.now();
      //   if (loginAttempt.attempts >= 5) {
      //     loginAttempt.lockedUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
      //   }
      //   await loginAttempt.save();
      // }
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const getProfile = require('../middleware/errorHandler').asyncHandler(async (req, res) => {
  let userQuery = User.findById(req.user._id);
  
  // Handle populateLoyalty query param
  if (req.query.populateLoyalty === 'true') {
    userQuery = userQuery.populate('loyalty');
  }
  
  const user = await userQuery;
  
  if (!user) {
    return res.status(404).json({ error: 'User profile not found' });
  }
  
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    addresses: user.addresses,
    loyalty: user.loyalty, // Include populated loyalty if requested
  });
});

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      if (req.body.addresses) {
        user.addresses = req.body.addresses;
      }
      if (req.body.password) {
        user.password = req.body.password;
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

const checkSuperAdminExists = async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'SUPER_ADMIN' });
    res.json({ exists: count > 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const nodemailer = require('nodemailer');
const crypto = require('crypto');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const forgotPassword = require('../middleware/errorHandler').asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetToken = crypto.randomBytes(20).toString('hex');
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:4200'}/reset-password/${user.resetToken}`;

    const message = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
      <p>This link expires in 15 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: 'Password Reset - Cloud Kitchen',
      html: message
    });

    res.status(200).json({ message: 'Reset link sent to your email' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const resetPassword = require('../middleware/errorHandler').asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = { register, login, getProfile, updateProfile, addAddress, removeAddress, checkSuperAdminExists, forgotPassword, resetPassword };
