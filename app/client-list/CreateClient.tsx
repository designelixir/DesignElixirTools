import { useState, FormEvent, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import ColorSelector from '../components/ColorSelector';
import { getRandomColor } from '../components/ColorSelector';

interface CreateClientProps {
  onClientCreated: () => void;
  onClose: () => void;
}

export default function CreateClient({ onClientCreated, onClose }: CreateClientProps) {
  const [formData, setFormData] = useState({
    client_first: '',
    client_last: '',
    client_email: '',
    client_phone: '',
    client_company: '',
    client_color: '',
    client_image: null as File | null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    // Pick a random color on mount
    setFormData(prev => ({ ...prev, client_color: getRandomColor() }));
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, client_image: file });
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      let imageUrl = '';

      if (formData.client_image) {
        const fileExt = formData.client_image.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('client-images')
          .upload(fileName, formData.client_image);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('client-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      const { error: insertError } = await supabase
        .from('clients')
        .insert([{
          client_first: formData.client_first,
          client_last: formData.client_last,
          client_email: formData.client_email,
          client_phone: formData.client_phone,
          client_company: formData.client_company,
          client_color: formData.client_color,
          client_image: imageUrl || null,
        }]);

      if (insertError) {
        throw insertError;
      }

      setLoading(false);
      onClientCreated();
    } catch (err: any) {
      console.error('Error creating client:', err);
      setError(err.message || 'Failed to create client');
      setLoading(false);
    }
  };

  return (
    <div>
      <div>
        <h2>Add New Client</h2>
        <button type="button" onClick={onClose}>✕</button>
      </div>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
          <ColorSelector
            selectedColor={formData.client_color}
            onColorChange={(color) => setFormData({ ...formData, client_color: color })}
          />

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Client Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ marginBottom: '10px' }}
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  width: '60px',
                  height: '60px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  border: '2px solid #ddd',
                }}
              />
            )}
          </div>
        </div>

        <div>
          <label>First Name *</label>
          <input
            type="text"
            required
            value={formData.client_first}
            onChange={(e) => setFormData({ ...formData, client_first: e.target.value })}
          />
        </div>

        <div>
          <label>Last Name *</label>
          <input
            type="text"
            required
            value={formData.client_last}
            onChange={(e) => setFormData({ ...formData, client_last: e.target.value })}
          />
        </div>

        <div>
          <label>Email *</label>
          <input
            type="email"
            required
            value={formData.client_email}
            onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
          />
        </div>

        <div>
          <label>Phone</label>
          <input
            type="tel"
            value={formData.client_phone}
            onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
          />
        </div>

        <div>
          <label>Company Name</label>
          <input
            type="text"
            value={formData.client_company}
            onChange={(e) => setFormData({ ...formData, client_company: e.target.value })}
          />
        </div>

        <div>
          <button type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      </form>
    </div>
  );
}