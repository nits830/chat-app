const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// Get messages between current user and a friend
router.get('/:friendId', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.friendId },
        { sender: req.params.friendId, receiver: req.user._id }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Send a new message
router.post('/', protect, async (req, res) => {
  try {
    const { receiver, content } = req.body;

    if (!receiver || !content) {
      return res.status(400).json({ message: 'Please provide receiver and content' });
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver,
      content,
      status: 'sending'
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

module.exports = router; 