import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Client } from '@/types/globalTypes';

interface DeleteClientProps {
  client: Client;
  onClientDeleted: () => void;
  onClose: () => void;
}

export default function DeleteClient({ client, onClientDeleted, onClose }: DeleteClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);

      if (deleteError) {
        throw deleteError;
      }

      setLoading(false);
      onClientDeleted();
    } catch (err: any) {
      console.error('Error deleting client:', err);
      setError(err.message || 'Failed to delete client');
      setLoading(false);
    }
  };

  return (
    <div>
      <div>
        <h2>Delete Client</h2>
        <button type="button" onClick={onClose}>✕</button>
      </div>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <p>
        Are you sure you want to delete <strong>{client.client_first} {client.client_last}</strong>?
        This action cannot be undone.
      </p>

      <div>
        <button type="button" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button type="button" onClick={handleDelete} disabled={loading}>
          {loading ? 'Deleting...' : 'Delete Client'}
        </button>
      </div>
    </div>
  );
}