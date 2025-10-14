import { useState, FormEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Client } from '@/types/globalTypes';

interface EditClientProps {
  client: Client;
  onClientUpdated: () => void;
  onClose: () => void;
}

export default function EditClient({ client, onClientUpdated, onClose }: EditClientProps) {
  const [formData, setFormData] = useState({
    client_first: client.client_first,
    client_last: client.client_last,
    client_email: client.client_email,
    client_phone: client.client_phone,
    client_company: client.client_company,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('clients')
        .update(formData)
        .eq('id', client.id);

      if (updateError) {
        throw updateError;
      }

      setLoading(false);
      onClientUpdated();
    } catch (err: any) {
      console.error('Error updating client:', err);
      setError(err.message || 'Failed to update client');
      setLoading(false);
    }
  };

  return (
    <div>
      <div>
        <h2>Edit Client</h2>
        <button type="button" onClick={onClose}>✕</button>
      </div>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
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
            {loading ? 'Updating...' : 'Update Client'}
          </button>
        </div>
      </form>
    </div>
  );
}