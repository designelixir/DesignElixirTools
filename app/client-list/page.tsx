'use client'; // if using app directory

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Client } from '@/types/globalTypes';
import ClientList from './ClientList';
import CreateClient from './CreateClient';
import EditClient from './EditClient';
import DeleteClient from './DeleteClient';
import ClientSummary from './ClientSummary';

type ModalMode = 'create' | 'summary' | 'edit' | 'delete' | null;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }

      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setModalMode('summary');
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedClient(null);
  };

  const handleClientCreated = () => {
    fetchClients();
    handleCloseModal();
  };

  const handleClientUpdated = () => {
    fetchClients();
    handleCloseModal();
  };

  const handleClientDeleted = () => {
    fetchClients();
    handleCloseModal();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div>
        <h1>Clients</h1>
        <button onClick={() => setModalMode('create')}>+ Add Client</button>
      </div>

      <ClientList clients={clients} onClientClick={handleClientClick} />

      {modalMode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            {modalMode === 'create' && (
              <CreateClient
                onClientCreated={handleClientCreated}
                onClose={handleCloseModal}
              />
            )}
            {modalMode === 'summary' && selectedClient && (
              <ClientSummary
                client={selectedClient}
                onEdit={() => setModalMode('edit')}
                onDelete={() => setModalMode('delete')}
                onClose={handleCloseModal}
              />
            )}
            {modalMode === 'edit' && selectedClient && (
              <EditClient
                client={selectedClient}
                onClientUpdated={handleClientUpdated}
                onClose={handleCloseModal}
              />
            )}
            {modalMode === 'delete' && selectedClient && (
              <DeleteClient
                client={selectedClient}
                onClientDeleted={handleClientDeleted}
                onClose={handleCloseModal}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}