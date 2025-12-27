// components/SelectableCalendar.tsx
'use client'
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface SelectableCalendarProps {
  value: Date | null;
  onChange: (date: Date) => void;
  label: string | null;
  disabled?: boolean;
}

export default function SelectableCalendar({ value, onChange, label, disabled = false }: SelectableCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState<string>('');
  const [tempTime, setTempTime] = useState<string>('');
  const [error, setError] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const dateStr = value.toISOString().split('T')[0];
      const timeStr = value.toTimeString().slice(0, 5);
      setTempDate(dateStr);
      setTempTime(timeStr);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setError('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDisplay = (date: Date | null): string => {
    if (!date) return 'Not set';
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${timeStr}`;
  };

  const handleApply = () => {
    if (tempDate && tempTime) {
      const newDate = new Date(`${tempDate}T${tempTime}`);
      const now = new Date();
      
      // Check if date is in the future
      if (newDate > now) {
        setError('Start time cannot be in the future');
        return;
      }

      onChange(newDate);
      setIsOpen(false);
      setError('');
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button type="button" onClick={() => !disabled && setIsOpen(!isOpen)} disabled={disabled} className="selectable-calendar-button time-bar-input" >
        <Image src="/calendar.png" alt="calendar icon" width={25} height={25} style={{marginTop: '2px'}}/>
      </button>

      {isOpen && !disabled && (
        <div className="calendar-box">
          <div className="flex-start-start flex-column" style={{marginBottom: '10px'}}>
            <label>Date:</label>
            <input className="full-width" type="date" value={tempDate} onChange={(e) => setTempDate(e.target.value)} />
          </div>
          <div className="flex-start-start flex-column" style={{ marginBottom: '15px' }}>
            <label>Time:</label>
            <input className="full-width" type="time" value={tempTime} onChange={(e) => setTempTime(e.target.value)} />
          </div>
          {error && (
            <div style={{ color: 'red', marginBottom: '10px', fontSize: '14px' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleApply} > Apply </button>
            <button className="system-button" onClick={() => { setIsOpen(false); setError(''); }} > Cancel </button>
          </div>
        </div>
      )}
    </div>
  );
}