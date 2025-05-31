const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, dateOfBirth } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    dateOfBirth
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    token: generateToken(user._id)
  });
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (user && (await user.comparePassword(password))) {
    user.status = 'online';
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
      token: generateToken(user._id)
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Logout user
// @route   POST /api/users/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.status = 'offline';
    user.lastSeen = new Date();
    await user.save();
  }
  res.json({ message: 'Logged out successfully' });
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json(user);
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.name = req.body.name || user.name;
    user.bio = req.body.bio || user.bio;
    
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) {
        res.status(400);
        throw new Error('Email already in use');
      }
      user.email = req.body.email;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      bio: updatedUser.bio,
      profilePic: updatedUser.profilePic
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update profile picture
// @route   PUT /api/users/profile/picture
// @access  Private
const updateProfilePicture = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.profilePic = req.body.profilePic;
    const updatedUser = await user.save();
    res.json({ profilePic: updatedUser.profilePic });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get user contacts
// @route   GET /api/users/contacts
// @access  Private
const getContacts = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('contacts', 'name profilePic status lastSeen');
  res.json(user.contacts);
});

// @desc    Add contact
// @route   POST /api/users/contacts
// @access  Private
const addContact = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const user = await User.findById(req.user._id);
  
  if (!user.contacts.includes(userId)) {
    user.contacts.push(userId);
    await user.save();
  }
  
  const contact = await User.findById(userId).select('name profilePic status lastSeen');
  res.json(contact);
});

// @desc    Remove contact
// @route   DELETE /api/users/contacts/:userId
// @access  Private
const removeContact = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.contacts = user.contacts.filter(id => id.toString() !== req.params.userId);
  await user.save();
  res.json({ message: 'Contact removed' });
});

// @desc    Block user
// @route   POST /api/users/block/:userId
// @access  Private
const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  await user.blockUser(req.params.userId);
  res.json({ message: 'User blocked successfully' });
});

// @desc    Get blocked users
// @route   GET /api/users/blocked
// @access  Private
const getBlockedUsers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('blockedUsers', 'name profilePic');
  res.json(user.blockedUsers);
});

// @desc    Search users
// @route   GET /api/users/search
// @access  Private
const searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const users = await User.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } }
    ],
    _id: { $ne: req.user._id }
  }).select('name profilePic status lastSeen');
  
  res.json(users);
});

// @desc    Get user online status
// @route   GET /api/users/online-status/:userId
// @access  Private
const getUserOnlineStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId)
    .select('status lastSeen');
  res.json(user);
});

// @desc    Get online contacts
// @route   GET /api/users/online-contacts
// @access  Private
const getOnlineContacts = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: 'contacts',
      match: { status: 'online' },
      select: 'name profilePic status lastSeen'
    });
  
  res.json(user.contacts);
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
  updateProfilePicture,
  getContacts,
  addContact,
  removeContact,
  blockUser,
  getBlockedUsers,
  searchUsers,
  getUserOnlineStatus,
  getOnlineContacts
}; 