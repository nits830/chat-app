const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['individual', 'group'],
    required: true
  },
  name: {
    type: String,
    required: function() {
      return this.type === 'group';
    }
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  groupImage: {
    type: String,
    default: 'default-group.png'
  },
  description: {
    type: String,
    maxlength: 200
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    onlyAdminsCanMessage: {
      type: Boolean,
      default: false
    },
    onlyAdminsCanAddParticipants: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes for faster queries
chatSchema.index({ 'participants.user': 1 });
chatSchema.index({ type: 1, 'participants.user': 1 });

// Method to add participant to group chat
chatSchema.methods.addParticipant = async function(userId, adminId) {
  if (this.type !== 'group') {
    throw new Error('Can only add participants to group chats');
  }
  
  const admin = this.participants.find(p => p.user.toString() === adminId.toString());
  if (this.settings.onlyAdminsCanAddParticipants && (!admin || admin.role !== 'admin')) {
    throw new Error('Only admins can add participants');
  }
  
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  if (!existingParticipant) {
    this.participants.push({
      user: userId,
      role: 'member',
      joinedAt: new Date()
    });
    return this.save();
  }
  return this;
};

// Method to remove participant from group chat
chatSchema.methods.removeParticipant = async function(userId, adminId) {
  if (this.type !== 'group') {
    throw new Error('Can only remove participants from group chats');
  }
  
  const admin = this.participants.find(p => p.user.toString() === adminId.toString());
  if (!admin || admin.role !== 'admin') {
    throw new Error('Only admins can remove participants');
  }
  
  this.participants = this.participants.filter(p => p.user.toString() !== userId.toString());
  return this.save();
};

// Method to update last message
chatSchema.methods.updateLastMessage = async function(messageId) {
  this.lastMessage = messageId;
  return this.save();
};

// Static method to find or create individual chat
chatSchema.statics.findOrCreateIndividualChat = async function(user1Id, user2Id) {
  const chat = await this.findOne({
    type: 'individual',
    'participants.user': { $all: [user1Id, user2Id] },
    'participants.2': { $exists: false }
  });
  
  if (chat) return chat;
  
  return this.create({
    type: 'individual',
    participants: [
      { user: user1Id, role: 'member' },
      { user: user2Id, role: 'member' }
    ]
  });
};

// Static method to get user's chats with last message
chatSchema.statics.getUserChats = async function(userId) {
  return this.find({
    'participants.user': userId,
    isActive: true
  })
  .populate('participants.user', 'name profilePic status')
  .populate('lastMessage')
  .sort({ updatedAt: -1 })
  .lean();
};

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat; 