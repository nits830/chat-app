let io;

const setIO = (socketIO) => {
  io = socketIO;
};

const getIO = () => io;

module.exports = {
  setIO,
  getIO
}; 