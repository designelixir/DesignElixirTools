import { useState } from 'react';

export default function QRCodeGenerator2() {
  const [url, setUrl] = useState('');
const [qrData, setQrData] = useState<string | null>(null);

  const generateQR = () => {
    if (!url.trim()) {
      alert('Please enter a URL');
      return;
    }
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`;
    setQrData(qrUrl);
  };

  const downloadPNG = () => {
    if (!qrData) return;
    
    const link = document.createElement('a');
    link.href = qrData;
    link.download = 'qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSVG = () => {
    if (!qrData) return;
    
    const svgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=svg&data=${encodeURIComponent(url)}`;
    
    fetch(svgUrl)
      .then(response => response.text())
      .then(svgContent => {
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = 'qrcode.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>QR Code Generator</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>Enter URL:</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          onKeyPress={(e) => e.key === 'Enter' && generateQR()}
        />
      </div>

      <button 
        onClick={generateQR}
        style={{ padding: '10px 20px', marginRight: '10px', cursor: 'pointer' }}
      >
        Generate QR Code
      </button>

      {qrData && (
        <div style={{ marginTop: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <img 
              src={qrData} 
              alt="QR Code" 
              style={{ width: '256px', height: '256px', border: '2px solid #ccc' }}
            />
          </div>

          <button
            onClick={downloadPNG}
            style={{ padding: '10px 20px', marginRight: '10px', cursor: 'pointer' }}
          >
            Download PNG
          </button>
          
          <button
            onClick={downloadSVG}
            style={{ padding: '10px 20px', cursor: 'pointer' }}
          >
            Download SVG
          </button>
        </div>
      )}
    </div>
  );
}