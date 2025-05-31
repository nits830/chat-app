// Map to store online users: userId -> socketId
const onlineUsers = new Map();

const addUser = (userId, socketId) => {
  console.log('Adding user to online users:', { userId, socketId });
  onlineUsers.set(userId.toString(), socketId);
  console.log('Current online users:', Array.from(onlineUsers.entries()));
};

const removeUser = (userId) => {
  console.log('Removing user from online users:', userId);
  onlineUsers.delete(userId.toString());
  console.log('Current online users:', Array.from(onlineUsers.entries()));
};

const getUser = (userId) => {
  const socketId = onlineUsers.get(userId.toString());
  console.log('Getting user socket:', { userId, socketId });
  return socketId;
};

const getAllUsers = () => {
  const users = Array.from(onlineUsers.keys());
  console.log('Getting all online users:', users);
  return users;
};

module.exports = {
  addUser,
  removeUser,
  getUser,
  getAllUsers
}; 