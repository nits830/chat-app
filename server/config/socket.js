const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: '*', // Allow all origins for testing
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user._id}`);

    // Update user status to online
    User.findByIdAndUpdate(socket.user._id, { status: 'online' }).exec();

    // Join user's personal room
    socket.join(socket.user._id.toString());

    // Handle joining chat rooms
    socket.on('join chat', (chatId) => {
      console.log(`User ${socket.user._id} joined chat: ${chatId}`);
      socket.join(chatId);
    });

    // Handle leaving chat rooms
    socket.on('leave chat', (chatId) => {
      console.log(`User ${socket.user._id} left chat: ${chatId}`);
      socket.leave(chatId);
    });

    // Handle new messages
    socket.on('new message', async (message) => {
      try {
        console.log('New message received:', message);
        
        // Find the chat and populate participants
        const chat = await Chat.findById(message.chat)
          .populate('participants.user', '_id');

        if (!chat) {
          console.log('Chat not found:', message.chat);
          return;
        }

        // Get all participant IDs except the sender
        const recipientIds = chat.participants
          .filter(p => p.user._id.toString() !== socket.user._id.toString())
          .map(p => p.user._id.toString());

        console.log('Sending message to recipients:', recipientIds);

        // Emit to all recipients
        recipientIds.forEach(recipientId => {
          io.to(recipientId).emit('message received', {
            ...message,
            sender: {
              _id: socket.user._id,
              name: socket.user.name
            }
          });
        });
      } catch (error) {
        console.error('Error handling new message:', error);
      }
    });

    // Handle typing status
    socket.on('typing', (chatId) => {
      socket.to(chatId).emit('typing', socket.user._id);
    });

    // Handle stop typing
    socket.on('stop typing', (chatId) => {
      socket.to(chatId).emit('stop typing', socket.user._id);
    });

    // Handle online status
    socket.on('online', () => {
      User.findByIdAndUpdate(socket.user._id, { status: 'online' }).exec();
      socket.broadcast.emit('user online', socket.user._id);
    });

    // Handle offline status
    socket.on('offline', () => {
      User.findByIdAndUpdate(socket.user._id, {
        status: 'offline',
        lastSeen: new Date()
      }).exec();
      socket.broadcast.emit('user offline', socket.user._id);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user._id}`);
      User.findByIdAndUpdate(socket.user._id, {
        status: 'offline',
        lastSeen: new Date()
      }).exec();
      socket.broadcast.emit('user offline', socket.user._id);
    });
  });

  return io;
};

module.exports = initializeSocket; 