import { Client } from "@/types/globalTypes";

interface ClientListProps {
  clients: Client[];
  onClientClick: (client: Client) => void;
}

export default function ClientList({ clients, onClientClick }: ClientListProps) {
  if (clients.length === 0) {
    return <p>No clients yet. Add your first client!</p>;
  }

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Company</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr
              key={client.id}
              onClick={() => onClientClick(client)}
              style={{ cursor: 'pointer' }}
            >
              <td>{client.client_first} {client.client_last}</td>
              <td>{client.client_email}</td>
              <td>{client.client_phone || 'N/A'}</td>
              <td>{client.client_company || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}