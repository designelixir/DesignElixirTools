// components/ColorSelector.tsx
import { useState, useEffect, useRef } from 'react';

interface ColorSelectorProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const COLOR_PALETTE = [
  '#3E3641', '#6775F6', '#CDA7F4', '#CCA6F3', '#6774F6',
  '#3D3540', '#CEA8F5', '#CBA5F2', '#6774F5', '#6674F5',
  '#6773F5', '#CFA9F6', '#6673F5', '#CAA4F1', '#3D3541',
  '#6674F6', '#3D353F', '#3D3641', '#2A100F', '#3E3640',
  '#3D353E', '#CEA8F4', '#CDA7F3', '#000458', '#281010',
  '#000457', '#CCA6F2', '#3E3540', '#C9A3F0', '#6574F5',
  '#6773F4', '#3E3541', '#03085D', '#3D353D', '#CFA9F5',
  '#3E363F', '#02075C', '#937AF7', '#6674F4', '#050A61',
  '#3C343F', '#6773F6', '#6673F4', '#3C3541', '#3C3540',
  '#6573F5', '#CCA7F4', '#6774F4', '#CBA6F3', '#040960',
  '#D0AAF7', '#170C0A', '#110E07', '#04095E', '#CDA8F5',
  '#CBA5F1', '#CEA8F3', '#060B62', '#6775F7', '#CDA7F2',
  '#3D353C', '#2B1110', '#C8A2EF', '#3D3640', '#3D3542',
  '#6873F5', '#3C3542', '#3E353F', '#6574F4', '#3E353E',
  '#6673F6', '#01065B', '#3C353F', '#03085C', '#000456',
  '#D0AAF6', '#6874F6', '#3C343E', '#6977F9', '#5147A1',
  '#3D3442', '#CFA9F4', '#6876F8', '#EFB488', '#170D0B',
  '#CAA5F2', '#3E353D', '#EC685C', '#050A5F', '#3B333D',
  '#000357', '#000459', '#CBA5F3', '#6875F7', '#3D3440',
  '#6976F9', '#3C343D', '#9279F6', '#CEA9F6', '#6874F5'
];


export default function ColorSelector({ selectedColor, onColorChange }: ColorSelectorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={pickerRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setShowColorPicker(!showColorPicker)}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: selectedColor,
          cursor: 'pointer',
          border: '3px solid #ddd',
        }}
      />
      {showColorPicker && (
        <div style={{
          position: 'absolute',
          top: '70px',
          left: 0,
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #ddd',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '8px',
          width: '240px',
        }}>
          {COLOR_PALETTE.map((color) => (
            <div
              key={color}
              onClick={() => {
                onColorChange(color);
                setShowColorPicker(false);
              }}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: color,
                cursor: 'pointer',
                border: selectedColor === color ? '3px solid #333' : '2px solid #ddd',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to get a random color from the palette
export const getRandomColor = () => {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
};