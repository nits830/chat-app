'use client';

import { useState } from 'react';
import Navbar from './components/Navbar';
import AddFriend from './components/AddFriend';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFriendAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <AddFriend onFriendAdded={handleFriendAdded} />
      <div key={refreshKey}>
        {children}
      </div>
    </div>
  );
} 