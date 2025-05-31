const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const { setIO } = require('./utils/io');
const { addUser, removeUser, getUser, getAllUsers } = require('./utils/onlineUsers');
const User = require('./models/User');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for testing
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }
  });

  // Set io instance globally
  setIO(io);

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log('User connected:', socket.userId);
    
    // Add user to online users
    addUser(socket.userId, socket.id);
    
    // Update user status in database
    await User.findByIdAndUpdate(socket.userId, {
      status: 'online',
      lastSeen: new Date()
    });
    
    // Send current online users to the connected user
    socket.emit('onlineUsers', getAllUsers());
    
    // Broadcast to all other users that this user is online
    socket.broadcast.emit('userStatus', {
      userId: socket.userId,
      status: 'online'
    });

    // Send pending messages to the user
    const pendingMessages = await Message.find({
      receiver: socket.userId,
      status: { $ne: 'read' }
    }).sort({ createdAt: 1 });
    
    if (pendingMessages.length > 0) {
      socket.emit('pendingMessages', pendingMessages);
    }

    // Handle new messages
    socket.on('sendMessage', async (message) => {
      try {
        console.log('Received message to send:', message);
        
        // Create the message in the database
        const newMessage = await Message.create({
          sender: socket.userId,
          receiver: message.receiver,
          content: message.content,
          status: 'sending'
        });

        console.log('Created new message:', newMessage);

        // Emit to sender
        socket.emit('messageSent', {
          ...newMessage.toObject(),
          status: 'delivered'
        });

        // Find receiver's socket
        const receiverSocketId = getUser(message.receiver);
        console.log('Receiver socket ID:', receiverSocketId);

        if (receiverSocketId) {
          console.log('Sending message to online receiver:', message.receiver);
          // Receiver is online, send message directly
          io.to(receiverSocketId).emit('newMessage', {
            ...newMessage.toObject(),
            status: 'delivered'
          });
        } else {
          console.log('Receiver is offline:', message.receiver);
        }

        // Update message status to delivered
        await Message.findByIdAndUpdate(newMessage._id, { status: 'delivered' });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('messageError', { error: 'Failed to send message' });
      }
    });

    // Handle message read status
    socket.on('messageRead', async (messageId) => {
      try {
        console.log('Message read event received:', messageId);
        const message = await Message.findById(messageId);
        
        if (message && message.receiver.toString() === socket.userId.toString()) {
          message.status = 'read';
          await message.save();

          // Notify sender that message was read
          const senderSocketId = getUser(message.sender);
          
          if (senderSocketId) {
            console.log('Notifying sender of read status:', message.sender);
            io.to(senderSocketId).emit('messageRead', {
              messageId: message._id,
              readBy: socket.userId
            });
          }
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.userId);
      removeUser(socket.userId);
      
      // Update user status in database
      User.findByIdAndUpdate(socket.userId, {
        status: 'offline',
        lastSeen: new Date()
      }).catch(error => {
        console.error('Error updating user status:', error);
      });
      
      // Broadcast to all users that this user is offline
      socket.broadcast.emit('userStatus', {
        userId: socket.userId,
        status: 'offline'
      });
    });
  });

  return io;
};

module.exports = { initializeSocket }; 