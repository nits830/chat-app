const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// Admin middleware
const admin = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as an admin');
  }
});

// Verify email middleware
const verifyEmail = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.isVerified) {
    next();
  } else {
    res.status(401);
    throw new Error('Please verify your email first');
  }
});

// Check if user is blocked
const checkBlocked = asyncHandler(async (req, res, next) => {
  const targetUser = await User.findById(req.params.userId);
  
  if (!targetUser) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if either user has blocked the other
  const isBlocked = req.user.blockedUsers.includes(targetUser._id) ||
                   targetUser.blockedUsers.includes(req.user._id);

  if (isBlocked) {
    res.status(403);
    throw new Error('Cannot perform this action. User is blocked.');
  }

  next();
});

module.exports = {
  protect,
  admin,
  verifyEmail,
  checkBlocked
}; 