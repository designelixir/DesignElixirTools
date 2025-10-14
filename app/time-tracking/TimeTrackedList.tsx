import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { TimeEntry } from '@/types/globalTypes';

export default function TimeTrackedList() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('time-tracking')
        .select('*')
        .eq('tracking_finished', true)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error('Error fetching entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number | null): string => {
    if (!seconds) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (entries.length === 0) {
    return <div>No completed time entries yet.</div>;
  }

  return (
    <div>
      <h2>Time Tracking History</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Start Time</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>End Time</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Duration</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Client</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}>{formatDate(entry.start_time)}</td>
              <td style={{ padding: '10px' }}>{entry.end_time ? formatDate(entry.end_time) : 'N/A'}</td>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>{formatTime(entry.time_lapsed)}</td>
              <td style={{ padding: '10px' }}>{entry.client_company || 'N/A'}</td>
              <td style={{ padding: '10px' }}>{entry.description || 'No description'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}