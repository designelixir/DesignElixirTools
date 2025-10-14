import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Client } from '@/types/globalTypes';

interface SearchAndSelectClientProps {
  selectedClient: Client | null;
  onClientSelect: (client: Client) => void;
}

export default function SearchAndSelectClient({ selectedClient, onClientSelect }: SearchAndSelectClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clients.filter(client => 
        client.client_first.toLowerCase().includes(term) ||
        client.client_last.toLowerCase().includes(term) ||
        client.client_email.toLowerCase().includes(term) ||
        (client.client_company && client.client_company.toLowerCase().includes(term))
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchClients = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('client_first', { ascending: true });

      if (error) throw error;
      setClients(data || []);
      setFilteredClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const handleClientSelect = (client: Client) => {
    onClientSelect(client);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div>
        <input
          type="text"
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{ width: '100%', padding: '8px' }}
        />
        {selectedClient && (
          <div style={{ marginTop: '4px', fontSize: '14px', color: '#666' }}>
            Selected: {selectedClient.client_first} {selectedClient.client_last}
            {selectedClient.client_company && ` (${selectedClient.client_company})`}
          </div>
        )}
      </div>

      {isOpen && filteredClients.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 1000,
          marginTop: '4px'
        }}>
          {filteredClients.map(client => (
            <div
              key={client.id}
              onClick={() => handleClientSelect(client)}
              style={{
                padding: '8px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div style={{ fontWeight: 'bold' }}>
                {client.client_first} {client.client_last}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {client.client_email}
                {client.client_company && ` • ${client.client_company}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}