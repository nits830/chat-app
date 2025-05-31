const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createChat,
  getChats,
  getChatById,
  sendMessage,
  getMessages,
  deleteMessage,
  updateMessage,
  markMessagesAsRead,
  searchMessages,
  createGroupChat,
  updateGroupChat,
  leaveGroupChat,
  addGroupMembers,
  removeGroupMember,
  updateGroupAdmin
} = require('../controllers/chatController');

// Chat Routes
router.post('/', protect, createChat);
router.get('/', protect, getChats);
router.get('/:chatId', protect, getChatById);

// Message Routes
router.post('/:chatId/messages', protect, sendMessage);
router.get('/:chatId/messages', protect, getMessages);
router.delete('/:chatId/messages/:messageId', protect, deleteMessage);
router.put('/:chatId/messages/:messageId', protect, updateMessage);
router.put('/:chatId/messages/read', protect, markMessagesAsRead);
router.get('/:chatId/messages/search', protect, searchMessages);

// Group Chat Routes
router.post('/group', protect, createGroupChat);
router.put('/group/:chatId', protect, updateGroupChat);
router.post('/group/:chatId/leave', protect, leaveGroupChat);
router.post('/group/:chatId/members', protect, addGroupMembers);
router.delete('/group/:chatId/members/:userId', protect, removeGroupMember);
router.put('/group/:chatId/admin/:userId', protect, updateGroupAdmin);

module.exports = router; 