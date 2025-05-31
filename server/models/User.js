const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  dateOfBirth: {
    type: Date,
    required: false
  },
  profilePic: {
    type: String,
    default: 'default-profile.png' // Default profile picture path
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  bio: {
    type: String,
    maxlength: 200,
    default: ''
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    language: {
      type: String,
      default: 'en'
    },
    messagePrivacy: {
      type: String,
      enum: ['everyone', 'contacts', 'none'],
      default: 'everyone'
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to update last seen
userSchema.methods.updateLastSeen = async function() {
  this.lastSeen = new Date();
  return this.save();
};

// Method to add contact
userSchema.methods.addContact = async function(userId) {
  if (!this.contacts.includes(userId)) {
    this.contacts.push(userId);
    return this.save();
  }
  return this;
};

// Method to block user
userSchema.methods.blockUser = async function(userId) {
  if (!this.blockedUsers.includes(userId)) {
    this.blockedUsers.push(userId);
    // Remove from contacts if exists
    this.contacts = this.contacts.filter(id => id.toString() !== userId.toString());
    return this.save();
  }
  return this;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 