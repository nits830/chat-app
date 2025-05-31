'use client';

import { useState, useRef, useEffect } from 'react';

interface AddFriendProps {
  onFriendAdded?: () => void;
}

const AddFriend = ({ onFriendAdded }: AddFriendProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/users/search?query=${searchQuery}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setSearchResults(data);
        setIsDropdownOpen(true);
        setMessage({ text: '', type: '' });
      } else {
        setMessage({ text: data.message, type: 'error' });
        setIsDropdownOpen(false);
      }
    } catch (error) {
      setMessage({ text: 'Error searching users', type: 'error' });
      setIsDropdownOpen(false);
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/friends/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({ text: 'Friend added successfully!', type: 'success' });
        setSearchResults([]);
        setSearchQuery('');
        setIsDropdownOpen(false);
        // Trigger friend list refresh
        if (onFriendAdded) {
          onFriendAdded();
        }
      } else {
        setMessage({ text: data.message, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error adding friend', type: 'error' });
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-2">
      <div className="flex items-center gap-4 mb-2">
        <h2 className="text-xl font-bold gradient-text whitespace-nowrap">Add Friend</h2>
        <div className="relative flex-1" ref={dropdownRef}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch();
            }}
            placeholder="Search users by name or email"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          
          {isDropdownOpen && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((user: any) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => handleAddFriend(user._id)}
                >
                  <div>
                    <p className="font-medium text-gray-800">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <button className="px-3 py-1 text-sm font-medium text-white bg-emerald-500 rounded-md hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`mt-2 p-2 rounded-md text-sm ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default AddFriend; 