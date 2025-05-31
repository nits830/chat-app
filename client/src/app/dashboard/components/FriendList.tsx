'use client';

import { useState, useEffect } from 'react';

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
}

const FriendList = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFriends = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users/friends', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setFriends(data);
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
      const response = await fetch(`http://localhost:5000/api/messages/${friendId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriend || !newMessage.trim()) return;

    try {
      const response = await fetch('http://localhost:5000/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          receiver: selectedFriend._id,
          content: newMessage
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessages([...messages, data]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
                  <p className="font-medium">{friend.name}</p>
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
              <h3 className="font-semibold">{selectedFriend.name}</h3>
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
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
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