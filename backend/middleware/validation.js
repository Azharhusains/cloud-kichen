/**
 * Joi validation middleware for all POST/PUT APIs
 * Production-ready schemas with detailed error messages
 * Integrates with centralized error handler
 */

const Joi = require('joi');

// Auth schemas (extend existing express-validator where possible)
const authRegisterSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required().messages({
    'string.base': 'Name must be a string',
    'string.min': 'Name must be at least 2 characters',
    'any.required': 'Name is required'
  }),
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required'
  }),
  role: Joi.string().valid('CUSTOMER', 'ADMIN', 'SUPER_ADMIN').optional()
});

const authLoginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

const authForgotPasswordSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required'
  })
});

const authResetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required'
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required'
  })
});

// Order schemas
const orderItemSchema = Joi.object({
  menuItem: Joi.string().required().messages({
    'any.required': 'Menu item ID is required'
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required'
  }),
  quantityType: Joi.string().valid('FULL', 'HALF').default('FULL').optional(),
  price: Joi.number().min(0).required().messages({
    'number.base': 'Price must be a number',
    'number.min': 'Price cannot be negative',
    'any.required': 'Price is required'
  })
});

const deliveryAddressSchema = Joi.object({
  street: Joi.string().max(200).required().messages({
    'string.max': 'Street too long',
    'any.required': 'Street is required'
  }),
  city: Joi.string().max(100).required().messages({
    'string.max': 'City too long',
    'any.required': 'City is required'
  }),
  state: Joi.string().max(100).required(),
  zipCode: Joi.string().pattern(/^[0-9]{5,10}$/).required().messages({
    'string.pattern.base': 'Invalid zip code'
  }),
  country: Joi.string().default('India').optional()
});

const orderCreateSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required().messages({
    'array.min': 'At least one item required',
    'any.required': 'Items are required'
  }),
  deliveryAddress: deliveryAddressSchema.when('orderType', {
    is: 'delivery',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  saveAddress: Joi.boolean().optional(),
  orderType: Joi.string().valid('delivery', 'dine-in').default('delivery').required(),
  tableNumber: Joi.string().when('orderType', {
    is: 'dine-in',
    then: Joi.required().messages({ 'any.required': 'Table number required for dine-in' }),
    otherwise: Joi.optional().allow(null)
  }),
  paymentMethod: Joi.string().valid('cash', 'cod', 'online').required().messages({
    'any.required': 'Payment method required'
  })

});

const orderUpdateStatusSchema = Joi.object({
  status: Joi.string().valid('received', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'completed', 'cancelled').required()
});

// Menu schemas
const menuCreateUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Name too short',
    'any.required': 'Name required'
  }),
  category: Joi.string().trim().min(2).max(50).required(),
  description: Joi.string().max(500).required().messages({
    'string.max': 'Description too long',
    'any.required': 'Description required'
  }),
  fullPrice: Joi.number().min(0.01).required().messages({
    'number.min': 'Full price must be positive'
  }),
  halfPrice: Joi.number().min(0.01).when('supportsHalf', {
    is: true,
    then: Joi.required().messages({ 'any.required': 'Half price required when supportsHalf=true' }),
    otherwise: Joi.optional().allow(null)
  }),
  costPrice: Joi.number().min(0).required().messages({
    'number.min': 'Cost price cannot be negative'
  }),
  supportsHalf: Joi.boolean().optional(),
  isAvailable: Joi.boolean().optional()
});

// User profile update
const profileUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().optional(),
  password: Joi.string().min(6).max(128).optional(),
  addresses: Joi.array().items(deliveryAddressSchema).optional()
});

// Kitchen creation schema
const kitchenCreateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'any.required': 'Name is required'
  }),
  locations: Joi.array().items(Joi.object({
    street: Joi.string().max(200).required(),
    city: Joi.string().max(100).required(),
    state: Joi.string().max(100).optional(),
    zipCode: Joi.string().pattern(/^[0-9]{5,10}$/).required(),
    country: Joi.string().default('India').optional()
  })).optional()
});

// Team member schema
const addTeamMemberSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required(),
  role: Joi.string().valid('CHEF', 'STAFF', 'DELIVERY').required()
});

// Validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // All errors
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        message: detail.message,
        field: detail.path.join('.')
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    req.body = value;
    next();
  };
};

module.exports = {
  validateRequest,
  // Auth
  authRegister: validateRequest(authRegisterSchema),
  authLogin: validateRequest(authLoginSchema),
  authForgotPassword: validateRequest(authForgotPasswordSchema),
  authResetPassword: validateRequest(authResetPasswordSchema),
  
  // Orders
  orderCreate: validateRequest(orderCreateSchema),
  orderUpdateStatus: validateRequest(orderUpdateStatusSchema),
  
  // Menu
  menuCreateUpdate: validateRequest(menuCreateUpdateSchema),
  
  // Users
  profileUpdate: validateRequest(profileUpdateSchema),

  // Kitchen
  kitchenCreate: validateRequest(kitchenCreateSchema),
  addTeamMember: validateRequest(addTeamMemberSchema)
};


