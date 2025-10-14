import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Client } from '@/types/globalTypes';
import SearchAndSelectClient from '../components/SearchAndSelectClient';
import SelectableCalendar from '../components/SelectableCalendar';
import { useTracking } from '../context/TrackingContext';

interface ActiveSession {
  originalStartTime: string;
  selectedClient: Client | null;
  description: string;
  currentEntryId: string;
  storageMode: 'online' | 'local';
}

interface TimeTrackerBarProps {
  onEntrySaved: () => void;
}

export default function TimeTrackerBar({ onEntrySaved }: TimeTrackerBarProps) {
      const { checkTrackingStatus } = useTracking();

  const [originalStartTime, setOriginalStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [description, setDescription] = useState('');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<'online' | 'local'>('online');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load active session on mount
  useEffect(() => {
    loadActiveSession();
  }, []);

  // Save session state whenever it changes
  useEffect(() => {
    if (originalStartTime && currentEntryId) {
      saveSessionState();
    }
  }, [originalStartTime, selectedClient, description, currentEntryId, storageMode]);



  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (originalStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - originalStartTime.getTime()) / 1000);
        setElapsedSeconds(diff);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [originalStartTime]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadActiveSession = async () => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('time-tracking')
        .select('*')
        .eq('tracking_finished', false)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (data && !fetchError) {
        const start = new Date(data.start_time);
        setOriginalStartTime(start);
        setCurrentEntryId(data.id);
        setDescription(data.description || '');
        setStorageMode('online');
        
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        setElapsedSeconds(diff);
        
        if (data.client_id) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('*')
            .eq('id', data.client_id)
            .single();
          
          if (clientData) {
            setSelectedClient(clientData);
          }
        }
        
        setIsLoading(false);
        return;
      }

      const sessionData = localStorage.getItem('active_time_session');
      if (sessionData) {
        const session: ActiveSession = JSON.parse(sessionData);
        const originalStart = new Date(session.originalStartTime);
        setOriginalStartTime(originalStart);
        
        setSelectedClient(session.selectedClient);
        setDescription(session.description);
        setCurrentEntryId(session.currentEntryId);
        setStorageMode(session.storageMode);
        
        const now = new Date();
        const diff = Math.floor((now.getTime() - originalStart.getTime()) / 1000);
        setElapsedSeconds(diff);
      }
    } catch (err) {
      console.error('Error loading active session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSessionState = () => {
    if (!originalStartTime || !currentEntryId) return;

    const session: ActiveSession = {
      originalStartTime: originalStartTime.toISOString(),
      selectedClient,
      description,
      currentEntryId,
      storageMode
    };

    localStorage.setItem('active_time_session', JSON.stringify(session));
  };

  const clearSessionState = () => {
    localStorage.removeItem('active_time_session');
  };

  const handleStart = async () => {
    if (originalStartTime || currentEntryId) {
      setError('Please finish or cancel the current session first');
      return;
    }

    const now = new Date();
    setOriginalStartTime(now);
    setElapsedSeconds(0);
    setError('');

    try {
      const supabase = createClient();
      
      const { data: existingEntry } = await supabase
        .from('time-tracking')
        .select('id')
        .eq('tracking_finished', false)
        .limit(1)
        .single();

      if (existingEntry) {
        setError('You have an unfinished entry. Please complete it first.');
        setOriginalStartTime(null);
        return;
      }

      const { data, error: insertError } = await supabase
        .from('time-tracking')
        .insert([{
          start_time: now.toISOString(),
          tracking_finished: false,
          description: '',
          client_company: '',
          client_project: ''
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      setCurrentEntryId(data.id);
      setStorageMode('online');
    } catch (err) {
      console.error('Error creating entry:', err);
      setStorageMode('local');
      const localId = `local-${Date.now()}`;
      setCurrentEntryId(localId);
      localStorage.setItem(localId, JSON.stringify({
        start_time: now.toISOString(),
        tracking_finished: false
      }));
    }
  };

  const handleSave = async () => {
    if (!originalStartTime || !currentEntryId) {
      setError('No active tracking session');
      return;
    }

    if (!selectedClient) {
      setError('Please select a client');
      return;
    }

    const endTime = new Date();
    const timeLapsed = Math.floor((endTime.getTime() - originalStartTime.getTime()) / 1000);

    try {
      if (storageMode === 'online') {
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from('time-tracking')
          .update({
            start_time: originalStartTime.toISOString(),
            end_time: endTime.toISOString(),
            time_lapsed: timeLapsed,
            client_id: selectedClient.id,
            client_company: selectedClient.client_company || '',
            description: description,
            tracking_finished: true
          })
          .eq('id', currentEntryId);

        if (updateError) throw updateError;
      } else {
        const localData = {
          id: currentEntryId,
          start_time: originalStartTime.toISOString(),
          end_time: endTime.toISOString(),
          time_lapsed: timeLapsed,
          client_id: selectedClient.id,
          client_company: selectedClient.client_company || '',
          description: description,
          tracking_finished: true,
          stored_locally: true
        };
        localStorage.setItem(currentEntryId, JSON.stringify(localData));
      }

      clearSessionState();
      
      setOriginalStartTime(null);
      setElapsedSeconds(0);
      setSelectedClient(null);
      setDescription('');
      setCurrentEntryId(null);
      setError('');
      
      await checkTrackingStatus(); // Add this line - updates global tracking state and favicon
      onEntrySaved();
    } catch (err: any) {
      console.error('Error saving entry:', err);
      setError(err.message || 'Failed to save entry');
    }
  };

  const handleCancel = async () => {
    if (currentEntryId && storageMode === 'online') {
      try {
        const supabase = createClient();
        await supabase
          .from('time-tracking')
          .delete()
          .eq('id', currentEntryId);
      } catch (err) {
        console.error('Error deleting entry:', err);
      }
    } else if (currentEntryId && storageMode === 'local') {
      localStorage.removeItem(currentEntryId);
    }

    clearSessionState();
    
    setOriginalStartTime(null);
    setElapsedSeconds(0);
    setSelectedClient(null);
    setDescription('');
    setCurrentEntryId(null);
    setError('');
    await checkTrackingStatus();
  };

  const handleStartTimeChange = (newDate: Date) => {
    setOriginalStartTime(newDate);
    if (newDate) {
      const now = new Date();
      const diff = Math.floor((now.getTime() - newDate.getTime()) / 1000);
      setElapsedSeconds(diff > 0 ? diff : 0);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ccc', 
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: storageMode === 'online' ? '#4CAF50' : '#FFD700'
          }}
          title={storageMode === 'online' ? 'Stored online' : 'Stored locally'}
        />
        
        {originalStartTime && (
          <SelectableCalendar
            value={originalStartTime}
            onChange={handleStartTimeChange}
            label="Start Time"
          />
        )}
        
        <div style={{ fontSize: '32px', fontWeight: 'bold', padding: '0 10px' }}>
          {formatTime(elapsedSeconds)}
        </div>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          {!originalStartTime && (
            <button onClick={handleStart} style={{padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>Start Timer</button>
          )}
        </div>
      </div>

      {originalStartTime && (
        <>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Client:
            </label>
            <SearchAndSelectClient selectedClient={selectedClient} onClientSelect={setSelectedClient} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}> Description: </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you working on?"
              rows={3}
              style={{ width: '100%', padding: '8px', resize: 'vertical' }}
            />
          </div>

          {error && (
            <div style={{ color: 'red', marginBottom: '15px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Save Entry
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: '10px 20px',
                backgroundColor: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}