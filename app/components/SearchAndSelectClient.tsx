'use client'
import { useState, useEffect, useRef } from 'react';
import { fetchClients, fetchProjects } from '@/utils/clientUtils';
import { Client, Project } from '@/types/globalTypes';
import { SelectedClientData } from '@/types/globalTypes';

interface SearchAndSelectClientProps {
  selectedClient: SelectedClientData | null;
  onClientSelect: (clientData: SelectedClientData | null) => void;
}

interface ClientWithProjects extends Client {
  projects?: Project[];
}

export default function SearchAndSelectClient({ selectedClient, onClientSelect }: SearchAndSelectClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientWithProjects[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithProjects[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [selectedClientForProjects, setSelectedClientForProjects] = useState<ClientWithProjects | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clients.filter(client => {
        const nameMatch = client.client_first.toLowerCase().includes(term) ||
                         client.client_last.toLowerCase().includes(term) ||
                         client.client_email.toLowerCase().includes(term);
        
        const projectMatch = client.projects?.some(p => 
          p.project_name.toLowerCase().includes(term)
        ) || false;
        
        return nameMatch || projectMatch;
      });
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowProjectPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadClients = async () => {
    try {
      const [clientsData, allProjects] = await Promise.all([
        fetchClients(true), // Force refresh
        fetchProjects(true)  // Force refresh
      ]);

      const clientsWithProjects = clientsData.map(client => {
        const projectIds = typeof client.client_projects === 'string' 
          ? JSON.parse(client.client_projects) 
          : client.client_projects || [];

        const clientProjects = allProjects.filter(p => projectIds.includes(p.id));

        return { ...client, projects: clientProjects };
      });

      setClients(clientsWithProjects);
      setFilteredClients(clientsWithProjects);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  const handleClientClick = (client: ClientWithProjects) => {
    const projects = client.projects || [];
    
    if (projects.length === 0) {
      onClientSelect({
        client_id: client.id,
        client_name: `${client.client_first} ${client.client_last}`,
        client_first: client.client_first,
        client_last: client.client_last,
        project_id: '',
        project_name: 'No Project',
        project_color: '#CCCCCC'
      });
      setSearchTerm('');
      setIsOpen(false);
    } else if (projects.length === 1) {
      onClientSelect({
        client_id: client.id,
        client_name: `${client.client_first} ${client.client_last}`,
        client_first: client.client_first,
        client_last: client.client_last,
        project_id: projects[0].id,
        project_name: projects[0].project_name,
        project_color: projects[0].color || '#CCCCCC'
      });
      setSearchTerm('');
      setIsOpen(false);
    } else {
      setSelectedClientForProjects(client);
      setShowProjectPicker(true);
      setIsOpen(false);
    }
  };

  const handleProjectSelect = (project: Project) => {
    if (!selectedClientForProjects) return;
    
    onClientSelect({
      client_id: selectedClientForProjects.id,
      client_name: `${selectedClientForProjects.client_first} ${selectedClientForProjects.client_last}`,
      client_first: selectedClientForProjects.client_first,
      client_last: selectedClientForProjects.client_last,
      project_id: project.id,
      project_name: project.project_name,
      project_color: project.color || '#CCCCCC'
    });
    setSearchTerm('');
    setShowProjectPicker(false);
    setSelectedClientForProjects(null);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClientSelect(null);
    setSearchTerm('');
  };

  const handleInputFocus = () => {
    loadClients(); // Refresh data when focused
    setIsOpen(true);
  };

  return (
    <div ref={dropdownRef} className='select-client-wrapper flex-center-center' style={{ width: '100%', position: 'relative' }}>
      <div className='flex-center-start' style={{ width: '100%', position: 'relative' }}>
        {selectedClient && (
          <div className='circle' style={{ backgroundColor: selectedClient.project_color }} />
        )}
        <input
          type="text"
          className='time-bar-input'
          placeholder="Search clients..."
          value={selectedClient ? `${selectedClient.client_name} - ${selectedClient.project_name}` : searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={handleInputFocus}
          readOnly={!!selectedClient}
          style={{ paddingRight: selectedClient ? '30px' : undefined }}
        />
        {selectedClient && (
          <button
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#666',
              padding: '0 5px'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && filteredClients.length > 0 && (
        <div className="search-select-client-box">
          {filteredClients.map(client => {
            const projects = client.projects || [];
            return (
              <div
                key={client.id}
                onClick={() => handleClientClick(client)}
                className="search-select-client-entry"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {client.client_first} {client.client_last}
                </div>
                {projects.length > 0 ? (
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {projects.map((project: Project) => (
                      <div 
                        key={project.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 6px',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}
                      >
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: project.color || '#CCCCCC'
                          }}
                        />
                        <span>{project.project_name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#999' }}>No projects</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showProjectPicker && selectedClientForProjects && (
        <div className="search-select-client-box">
          <p style={{margin: '10px 0'}}>
            Select a project for {selectedClientForProjects.client_first} {selectedClientForProjects.client_last}:
          </p>
          {(selectedClientForProjects.projects || []).map(project => (
            <div
              key={project.id}
              onClick={() => handleProjectSelect(project)}
              className="search-select-client-entry"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: project.color || '#CCCCCC'
                  }}
                />
                <div style={{ fontWeight: 'bold' }}>
                  {project.project_name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}