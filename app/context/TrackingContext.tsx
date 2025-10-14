// context/TrackingContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { setFavicon } from '@/utils/favicon';
import { createClient } from '@/utils/supabase/client';

interface TrackingContextType {
  isTracking: boolean;
  checkTrackingStatus: () => Promise<void>;
}

const TrackingContext = createContext<TrackingContextType>({
  isTracking: false,
  checkTrackingStatus: async () => {},
});

export const useTracking = () => useContext(TrackingContext);

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const [isTracking, setIsTracking] = useState(false);

  const checkTrackingStatus = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('time-tracking')
        .select('id')
        .eq('tracking_finished', false)
        .limit(1)
        .single();
      
      const tracking = !!data;
      setIsTracking(tracking);
      setFavicon(tracking);
    } catch (err) {
      setIsTracking(false);
      setFavicon(false);
    }
  };

  useEffect(() => {
    checkTrackingStatus();
    const interval = setInterval(checkTrackingStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TrackingContext.Provider value={{ isTracking, checkTrackingStatus }}>
      {children}
    </TrackingContext.Provider>
  );
}