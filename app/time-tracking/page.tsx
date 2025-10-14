'use client'; // if using app directory

import { useState } from 'react';
import TimeTrackerBar from './TimeTrackerBar';
import TimeTrackedList from './TimeTrackedList';

export default function TimeTrackingPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEntrySaved = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Time Tracking</h1>
      
      <TimeTrackerBar onEntrySaved={handleEntrySaved} />
      
      <TimeTrackedList key={refreshKey} />
    </div>
  );
}