// components/SelectableCalendar.tsx
import { useState, useRef, useEffect } from 'react';

interface SelectableCalendarProps {
  value: Date | null;
  onChange: (date: Date) => void;
  label: string;
  disabled?: boolean;
}

export default function SelectableCalendar({ value, onChange, label, disabled = false }: SelectableCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState<string>('');
  const [tempTime, setTempTime] = useState<string>('');
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
      onChange(newDate);
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div style={{ marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>
        {label}
      </div>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          padding: '8px 12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: disabled ? '#f5f5f5' : 'white',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          minWidth: '150px',
          textAlign: 'left'
        }}
      >
        {formatDisplay(value)}
      </button>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '15px',
          marginTop: '5px',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          minWidth: '250px'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Date:</label>
            <input
              type="date"
              value={tempDate}
              onChange={(e) => setTempDate(e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '14px' }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Time:</label>
            <input
              type="time"
              value={tempTime}
              onChange={(e) => setTempTime(e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '14px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleApply}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Apply
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}