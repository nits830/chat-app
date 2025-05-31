const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Create a new chat
// @route   POST /api/chats
// @access  Private
const createChat = asyncHandler(async (req, res) => {
  const { participants } = req.body;
  
  // Ensure participants is an array
  if (!Array.isArray(participants)) {
    res.status(400);
    throw new Error('Participants must be an array');
  }

  // Add current user to participants if not already included
  const allParticipants = [...new Set([...participants, req.user._id.toString()])];
  
  // Format participants according to schema
  const formattedParticipants = allParticipants.map(userId => ({
    user: userId,
    role: 'member',
    joinedAt: new Date()
  }));

  // Check if chat already exists
  const existingChat = await Chat.findOne({
    type: 'individual',
    'participants.user': { $all: allParticipants },
    'participants.2': { $exists: false }
  });

  if (existingChat) {
    await existingChat.populate('participants.user', 'name profilePic status');
    return res.json(existingChat);
  }

  const chat = await Chat.create({
    type: 'individual',
    participants: formattedParticipants
  });

  await chat.populate('participants.user', 'name profilePic status');
  res.status(201).json(chat);
});

// @desc    Get all chats for a user
// @route   GET /api/chats
// @access  Private
const getChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({
    participants: req.user._id
  })
    .populate('participants', 'name profilePic status')
    .populate('lastMessage')
    .sort('-updatedAt');
  
  res.json(chats);
});

// @desc    Get chat by ID
// @route   GET /api/chats/:chatId
// @access  Private
const getChatById = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({
    _id: req.params.chatId,
    participants: req.user._id
  })
    .populate('participants', 'name profilePic status')
    .populate('lastMessage');

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  res.json(chat);
});

// @desc    Send a message
// @route   POST /api/chats/:chatId/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const { content, type = 'text' } = req.body;
  const chatId = req.params.chatId;

  const chat = await Chat.findOne({
    _id: chatId,
    participants: req.user._id
  });

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  const message = await Message.create({
    chat: chatId,
    sender: req.user._id,
    content,
    type
  });

  // Update chat's last message
  chat.lastMessage = message._id;
  await chat.save();

  await message.populate('sender', 'name profilePic');
  res.status(201).json(message);
});

// @desc    Get messages for a chat
// @route   GET /api/chats/:chatId/messages
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const chatId = req.params.chatId;

  const chat = await Chat.findOne({
    _id: chatId,
    participants: req.user._id
  });

  if (!chat) {
    res.status(404);
    throw new Error('Chat not found');
  }

  const messages = await Message.find({ chat: chatId })
    .populate('sender', 'name profilePic')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);

  res.json(messages);
});

// @desc    Delete a message
// @route   DELETE /api/chats/:chatId/messages/:messageId
// @access  Private
const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findOne({
    _id: req.params.messageId,
    chat: req.params.chatId,
    sender: req.user._id
  });

  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  await message.remove();
  res.json({ message: 'Message deleted' });
});

// @desc    Update a message
// @route   PUT /api/chats/:chatId/messages/:messageId
// @access  Private
const updateMessage = asyncHandler(async (req, res) => {
  const message = await Message.findOne({
    _id: req.params.messageId,
    chat: req.params.chatId,
    sender: req.user._id
  });

  if (!message) {
    res.status(404);
    throw new Error('Message not found');
  }

  message.content = req.body.content;
  message.isEdited = true;
  await message.save();

  res.json(message);
});

// @desc    Mark messages as read
// @route   PUT /api/chats/:chatId/messages/read
// @access  Private
const markMessagesAsRead = asyncHandler(async (req, res) => {
  const chatId = req.params.chatId;
  
  await Message.updateMany(
    {
      chat: chatId,
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id }
    },
    {
      $addToSet: { readBy: req.user._id }
    }
  );

  res.json({ message: 'Messages marked as read' });
});

// @desc    Search messages in a chat
// @route   GET /api/chats/:chatId/messages/search
// @access  Private
const searchMessages = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const chatId = req.params.chatId;

  const messages = await Message.find({
    chat: chatId,
    content: { $regex: query, $options: 'i' }
  })
    .populate('sender', 'name profilePic')
    .sort('-createdAt');

  res.json(messages);
});

// @desc    Create a group chat
// @route   POST /api/chats/group
// @access  Private
const createGroupChat = asyncHandler(async (req, res) => {
  const { name, participants } = req.body;

  if (participants.length < 2) {
    res.status(400);
    throw new Error('Group chat must have at least 2 participants');
  }

  const chat = await Chat.create({
    name,
    participants: [...participants, req.user._id],
    isGroupChat: true,
    admin: req.user._id
  });

  await chat.populate('participants', 'name profilePic status');
  res.status(201).json(chat);
});

// @desc    Update group chat
// @route   PUT /api/chats/group/:chatId
// @access  Private
const updateGroupChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({
    _id: req.params.chatId,
    isGroupChat: true,
    admin: req.user._id
  });

  if (!chat) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  if (req.body.name) chat.name = req.body.name;
  if (req.body.description) chat.description = req.body.description;

  await chat.save();
  await chat.populate('participants', 'name profilePic status');
  res.json(chat);
});

// @desc    Leave group chat
// @route   POST /api/chats/group/:chatId/leave
// @access  Private
const leaveGroupChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({
    _id: req.params.chatId,
    isGroupChat: true,
    participants: req.user._id
  });

  if (!chat) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  // If user is admin, transfer admin rights to another participant
  if (chat.admin.toString() === req.user._id.toString()) {
    const newAdmin = chat.participants.find(
      p => p.toString() !== req.user._id.toString()
    );
    if (newAdmin) {
      chat.admin = newAdmin;
    }
  }

  chat.participants = chat.participants.filter(
    p => p.toString() !== req.user._id.toString()
  );

  await chat.save();
  res.json({ message: 'Left group chat successfully' });
});

// @desc    Add members to group chat
// @route   POST /api/chats/group/:chatId/members
// @access  Private
const addGroupMembers = asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  const chat = await Chat.findOne({
    _id: req.params.chatId,
    isGroupChat: true,
    admin: req.user._id
  });

  if (!chat) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  chat.participants = [...new Set([...chat.participants, ...userIds])];
  await chat.save();
  
  await chat.populate('participants', 'name profilePic status');
  res.json(chat);
});

// @desc    Remove member from group chat
// @route   DELETE /api/chats/group/:chatId/members/:userId
// @access  Private
const removeGroupMember = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({
    _id: req.params.chatId,
    isGroupChat: true,
    admin: req.user._id
  });

  if (!chat) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  chat.participants = chat.participants.filter(
    p => p.toString() !== req.params.userId
  );

  await chat.save();
  await chat.populate('participants', 'name profilePic status');
  res.json(chat);
});

// @desc    Update group admin
// @route   PUT /api/chats/group/:chatId/admin/:userId
// @access  Private
const updateGroupAdmin = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({
    _id: req.params.chatId,
    isGroupChat: true,
    admin: req.user._id
  });

  if (!chat) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  if (!chat.participants.includes(req.params.userId)) {
    res.status(400);
    throw new Error('User is not a member of the group');
  }

  chat.admin = req.params.userId;
  await chat.save();
  
  await chat.populate('participants', 'name profilePic status');
  res.json(chat);
});

module.exports = {
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
}; 