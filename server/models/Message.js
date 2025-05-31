const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'audio', 'video'],
    default: 'text'
  },
  fileUrl: String,
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deleted: {
    type: Boolean,
    default: false
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'readBy.user': 1 });

/**
 * Fetch paginated messages with WhatsApp-like behavior
 * @param {string} chatId - The chat ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Messages per page (default: 50)
 * @param {string} options.before - Fetch messages before this message ID
 * @param {string} options.after - Fetch messages after this message ID
 * @param {boolean} options.includeDeleted - Include deleted messages (default: false)
 * @returns {Object} Messages and pagination info
 */
messageSchema.statics.getPaginatedMessages = async function(chatId, options = {}) {
  const {
    page = 1,
    limit = 50,
    before = null,
    after = null,
    includeDeleted = false
  } = options;

  // Build query
  const query = { chat: chatId };
  if (!includeDeleted) {
    query.deleted = false;
  }

  // Add date-based conditions if before/after message IDs are provided
  if (before || after) {
    const messageRef = before || after;
    const message = await this.findById(messageRef);
    
    if (message) {
      if (before) {
        query.createdAt = { $lt: message.createdAt };
      } else {
        query.createdAt = { $gt: message.createdAt };
      }
    }
  }

  // Get total count for pagination
  const totalMessages = await this.countDocuments(query);
  const totalPages = Math.ceil(totalMessages / limit);
  const skip = (page - 1) * limit;

  // Fetch messages
  const messages = await this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'name profilePic')
    .populate('replyTo', 'content sender')
    .lean();

  // Group messages by date for UI rendering
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  // Get message gaps (periods with no messages)
  const gaps = [];
  if (messages.length > 1) {
    for (let i = 0; i < messages.length - 1; i++) {
      const currentMsg = messages[i];
      const nextMsg = messages[i + 1];
      const timeDiff = currentMsg.createdAt - nextMsg.createdAt;
      
      // If gap is more than 1 hour, add it to gaps
      if (timeDiff > 3600000) { // 1 hour in milliseconds
        gaps.push({
          before: currentMsg._id,
          after: nextMsg._id,
          duration: timeDiff
        });
      }
    }
  }

  return {
    messages: groupedMessages,
    pagination: {
      currentPage: page,
      totalPages,
      totalMessages,
      hasMore: page < totalPages,
      limit
    },
    gaps,
    metadata: {
      oldestMessageId: messages[messages.length - 1]?._id,
      newestMessageId: messages[0]?._id
    }
  };
};

// Method to mark message as read
messageSchema.methods.markAsRead = async function(userId) {
  const alreadyRead = this.readBy.some(read => read.user.toString() === userId.toString());
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    return this.save();
  }
  return this;
};

// Method to soft delete message
messageSchema.methods.softDelete = async function() {
  this.deleted = true;
  return this.save();
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 