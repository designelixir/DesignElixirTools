import { Client } from '@/types/globalTypes';

interface ClientSummaryProps {
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function ClientSummary({ client, onEdit, onDelete, onClose }: ClientSummaryProps) {
  return (
    <div>
      <div>
        <h2>Client Details</h2>
        <button type="button" onClick={onClose}>✕</button>
      </div>

      <div>
        <div>
          <strong>Name:</strong> {client.client_first} {client.client_last}
        </div>
        <div>
          <strong>Email:</strong> {client.client_email}
        </div>
        <div>
          <strong>Phone:</strong> {client.client_phone || 'N/A'}
        </div>
        <div>
          <strong>Company:</strong> {client.client_company || 'N/A'}
        </div>
      </div>

      <div>
        <button type="button" onClick={onEdit}>Edit</button>
        <button type="button" onClick={onDelete}>Delete</button>
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}