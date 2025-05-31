'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const Navbar = () => {
  const [userName, setUserName] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // Fetch user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const { name } = JSON.parse(userData);
      setUserName(name);
    }
  }, []);

  const handleLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    // Redirect to login page
    router.push('/login');
  };

  return (
    <nav className="gradient-bg shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Left side - User Name */}
          <div className="flex items-center">
            <span className="text-white font-medium">
              {userName}
            </span>
          </div>

          {/* Right side - Logout button */}
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border-2 border-white text-sm font-medium rounded-md text-white hover:bg-white hover:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
            >
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 