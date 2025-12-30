'use client';

import { useState } from 'react';
import TimeTrackedList from './TimeTrackedList';
import AddTimeCSV from '../projects/AddTimeCSV';

export default function TimeTrackingPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEntrySaved = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className='flex-start-start flex-column basic-padding'>
      <h1>Time Tracking</h1>
      

      {/* <AddTimeCSV /> */}
      <TimeTrackedList defaultView="week" />
    </div>
  );
}