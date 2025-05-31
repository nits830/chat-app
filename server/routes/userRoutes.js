const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
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
  getOnlineContacts,
  addFriend,
  removeFriend,
  getFriends
} = require('../controllers/userController');

// Auth Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);

// Profile Routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/profile/picture', protect, updateProfilePicture);

// Contact Management Routes
router.get('/contacts', protect, getContacts);
router.post('/contacts', protect, addContact);
router.delete('/contacts/:userId', protect, removeContact);

// Block Management Routes
router.get('/blocked', protect, getBlockedUsers);
router.post('/block/:userId', protect, blockUser);

// User Search Routes
router.get('/search', protect, searchUsers);

// Online Status Routes
router.get('/online-status/:userId', protect, getUserOnlineStatus);
router.get('/online-contacts', protect, getOnlineContacts);

// Friend management routes
router.post('/friends/:userId', protect, addFriend);
router.delete('/friends/:userId', protect, removeFriend);
router.get('/friends', protect, getFriends);

// Export routes
module.exports = router; 