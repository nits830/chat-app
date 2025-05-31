'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Friend {
  _id: string;
  name: string;
  email: string;
}

interface Message {
  _id: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: string;
  status?: 'sending' | 'delivered' | 'read' | 'error';
}

const FriendList = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      return;
    }

    const socket = io('http://localhost:5000', {
      auth: {
        token
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (error.message.includes('Authentication error')) {
        // Token might be invalid or expired
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = '/login';
      }
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully');
    });

    // Listen for online users
    socket.on('onlineUsers', (users: string[]) => {
      setOnlineUsers(users);
    });

    // Listen for user status changes
    socket.on('userStatus', ({ userId, status }) => {
      setOnlineUsers(prev => {
        if (status === 'online') {
          return [...new Set([...prev, userId])];
        } else {
          return prev.filter(id => id !== userId);
        }
      });
    });

    // Listen for pending messages when coming online
    socket.on('pendingMessages', (pendingMessages: Message[]) => {
      console.log('Received pending messages:', pendingMessages);
      setMessages(prev => {
        const newMessages = pendingMessages.filter(
          message => !prev.some(m => m._id === message._id)
        );
        return [...prev, ...newMessages];
      });
    });

    // Listen for new messages
    socket.on('newMessage', (message: Message) => {
      console.log('Received new message:', message);
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(m => m._id === message._id)) {
          return prev;
        }
        return [...prev, message];
      });

      // Mark message as read if we're in the chat with the sender
      if (selectedFriend?._id === message.sender) {
        socket.emit('messageRead', message._id);
      }
    });

    // Listen for message sent confirmation
    socket.on('messageSent', (message: Message) => {
      console.log('Message sent confirmation:', message);
      setMessages(prev =>
        prev.map(msg =>
          msg._id === message._id ? { ...message, status: 'delivered' } : msg
        )
      );
    });

    // Listen for message delivery status
    socket.on('messageDelivered', ({ messageId, status }) => {
      console.log('Message delivery status:', { messageId, status });
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId ? { ...msg, status } : msg
        )
      );
    });

    // Listen for message read status
    socket.on('messageRead', ({ messageId, readBy }) => {
      console.log('Message read status:', { messageId, readBy });
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId ? { ...msg, status: 'read' } : msg
        )
      );
    });

    setSocket(socket);

    return () => {
      socket.close();
    };
  }, []);

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch('http://localhost:5000/api/users/friends', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok) {
        setFriends(data);
      } else {
        console.error('Error fetching friends:', data.message);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    if (selectedFriend) {
      fetchMessages(selectedFriend._id);
    }
  }, [selectedFriend]);

  const fetchMessages = async (friendId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/messages/${friendId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(data);
      } else {
        console.error('Error fetching messages:', data.message);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriend || !newMessage.trim() || !socket) return;

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      return;
    }

    const tempMessage: Message = {
      _id: Date.now().toString(), // Temporary ID
      sender: localStorage.getItem('userId') || '',
      receiver: selectedFriend._id,
      content: newMessage,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    // Optimistically add message to UI
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      // Emit the message through socket first
      socket.emit('sendMessage', {
        receiver: selectedFriend._id,
        content: newMessage
      });

      // Also save to database through REST API
      const response = await fetch('http://localhost:5000/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver: selectedFriend._id,
          content: newMessage
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save message to database');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Update message status to error
      setMessages(prev =>
        prev.map(msg =>
          msg._id === tempMessage._id ? { ...msg, status: 'error' } : msg
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] mt-4">
      {/* Friend List */}
      <div className="w-1/3 border-r border-gray-200">
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">Friends</h3>
          {friends.length === 0 ? (
            <p className="text-gray-500">No friends yet. Add some friends to start chatting!</p>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend._id}
                  onClick={() => setSelectedFriend(friend)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedFriend?._id === friend._id
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{friend.name}</p>
                    {onlineUsers.includes(friend._id) && (
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{selectedFriend.name}</h3>
                {onlineUsers.includes(selectedFriend._id) && (
                  <span className="text-sm text-emerald-500">Online</span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center">No messages yet. Start the conversation!</p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${
                      message.sender === localStorage.getItem('userId')
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender === localStorage.getItem('userId')
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100'
                      }`}
                    >
                      <p>{message.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <p className="text-xs opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                        {message.sender === localStorage.getItem('userId') && (
                          <span className="text-xs">
                            {message.status === 'sending' && '🕒'}
                            {message.status === 'delivered' && '✓'}
                            {message.status === 'read' && '✓✓'}
                            {message.status === 'error' && '❌'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Select a friend to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendList; 