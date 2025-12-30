'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { fetchProjectById } from '@/utils/clientUtils';
import { TimeEntry, Project } from '@/types/globalTypes';
import EditTimeEntry from './EditTimeEntry';
import SearchAndSelectClient from '../components/SearchAndSelectClient';
import InvoiceTimeEntries from '../invoices/InvoiceTimeEntries';
import { useTimeEntries } from '../context/TimeEntriesContext';

interface TimeTrackedListProps {
  filterProjectIds?: string[];
  defaultView?: 'week' | 'year' | 'total';
  showInvoiced?: boolean;
  billableRate?: number;
  showCalculations?: boolean;
  allowProjectSelection?: boolean;
  showPastInvoicesByDefault?: boolean;
}

type TimeView = 'week' | 'year' | 'total';

interface SelectedClientData {
  client_id: string;
  client_name: string;
  client_first: string;
  client_last: string;
  project_id: string;
  project_name: string;
  project_color: string;
}

interface TimeEntryWithProject extends TimeEntry {
  projectData?: Project | null;
}

export default function TimeTrackedList({ 
  filterProjectIds,
  defaultView = 'total',
  showInvoiced = false,
  billableRate,
  showCalculations = true,
  allowProjectSelection = true,
  showPastInvoicesByDefault = false
}: TimeTrackedListProps) {
  const { refreshTrigger } = useTimeEntries();
  const [entries, setEntries] = useState<TimeEntryWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<TimeView>(defaultView);
  const [showInvoicedAsWell, setShowInvoicedAsWell] = useState(showPastInvoicesByDefault);
  const [selectedFilter, setSelectedFilter] = useState<SelectedClientData | null>(null);
  const [activeProjectIds, setActiveProjectIds] = useState<string[]>(filterProjectIds || []);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const hasFixedFilter = filterProjectIds && filterProjectIds.length > 0;

  useEffect(() => {
    if (hasFixedFilter) {
      loadInitialFilter();
    }
  }, [filterProjectIds]);

  useEffect(() => {
    fetchEntries();
  }, [activeProjectIds, view, showInvoicedAsWell, refreshTrigger]);

  const loadInitialFilter = async () => {
    if (!filterProjectIds || filterProjectIds.length === 0) return;
    
    try {
      const project = await fetchProjectById(filterProjectIds[0]);

      if (project) {
        setSelectedFilter({
          client_id: project.client_id,
          client_name: `${project.client_first} ${project.client_last}`,
          client_first: project.client_first,
          client_last: project.client_last,
          project_id: project.id,
          project_name: project.project_name,
          project_color: project.color || '#CCCCCC'
        });
      }
    } catch (err) {
      console.error('Error loading initial filter:', err);
    }
  };

  const handleClientSelect = (clientData: SelectedClientData | null) => {
    if (hasFixedFilter) return;
    setSelectedFilter(clientData);
    setActiveProjectIds(clientData ? [clientData.project_id] : []);
  };

  const getDateRange = () => {
    const now = new Date();
    
    if (view === 'week') {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      
      return { start: monday, end: sunday };
    } else if (view === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
    
    return null;
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('time-tracking')
        .select('*')
        .eq('tracking_finished', true)
        .order('start_time', { ascending: false });

      const dateRange = getDateRange();
      if (dateRange) {
        query = query
          .gte('start_time', dateRange.start.toISOString())
          .lte('start_time', dateRange.end.toISOString());
      }

      // Filter by project_id if activeProjectIds is set
      if (activeProjectIds.length > 0) {
        query = query.in('project_id', activeProjectIds.map(id => parseInt(id)));
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];

      if (!showInvoicedAsWell) {
        filteredData = filteredData.filter(entry => entry.invoice_id == null);
      }

      // Fetch project data for each entry - use project_id directly
      const entriesWithProjects = await Promise.all(
        filteredData.map(async (entry) => {
          // Try to use project_id column first
          if (entry.project_id) {
            const projectData = await fetchProjectById(entry.project_id.toString());
            return { ...entry, projectData };
          }
          
          // Fallback to project JSONB column
          const projectObj = parseProject(entry.project);
          
          if (!projectObj) {
            return { ...entry, projectData: null };
          }
          
          // If the stored project object has a project_name, use it directly
          if (projectObj.project_name) {
            const projectData = {
              id: projectObj.project_id,
              project_name: projectObj.project_name,
              color: projectObj.project_color,
              client_id: projectObj.client_id,
              client_first: projectObj.client_first,
              client_last: projectObj.client_last,
              project_image: projectObj.project_image,
              hourly_rate: projectObj.hourly_rate,
              deadline: projectObj.deadline,
              active: projectObj.active
            };
            return { ...entry, projectData };
          }
          
          // Otherwise fetch from database using project_id from JSON
          if (projectObj.project_id) {
            const projectData = await fetchProjectById(projectObj.project_id);
            return { ...entry, projectData };
          }
          
          return { ...entry, projectData: null };
        })
      );

      setEntries(entriesWithProjects);
    } catch (err) {
      console.error('Error fetching entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    const uninvoicedEntries = entries.filter(entry => entry.invoice_id == null);
    
    if (selectedEntries.length === uninvoicedEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(uninvoicedEntries.map(e => e.id));
    }
  };

  const handleSelectEntry = (entryId: string) => {
    if (selectedEntries.includes(entryId)) {
      setSelectedEntries(selectedEntries.filter(id => id !== entryId));
    } else {
      setSelectedEntries([...selectedEntries, entryId]);
    }
  };

  const handleInvoiceClick = () => {
    if (selectedEntries.length === 0) return;
    setShowInvoiceModal(true);
  };

  const getSelectedEntriesData = () => {
    return entries.filter(entry => selectedEntries.includes(entry.id));
  };

  const calculateTotals = () => {
    const entriesToCalculate = showInvoicedAsWell 
      ? entries.filter(entry => entry.invoice_id == null)
      : entries;
      
    const totalSeconds = entriesToCalculate.reduce((sum, entry) => sum + (entry.time_lapsed || 0), 0);
    const totalHours = totalSeconds / 3600;
    const totalAmount = billableRate ? totalHours * billableRate : null;

    return {
      totalSeconds,
      totalHours: totalHours.toFixed(2),
      totalAmount: totalAmount ? totalAmount.toFixed(2) : null
    };
  };

  const formatTime = (seconds: number | null): string => {
    if (!seconds) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const parseProject = (project: any) => {
    if (!project) return null;
    if (typeof project === 'string') {
      try {
        return JSON.parse(project);
      } catch {
        return null;
      }
    }
    return project;
  };

  const getViewLabel = () => {
    const uninvoicedCount = entries.filter(entry => entry.invoice_id == null).length;
    const totalCount = entries.length;
    
    let baseLabel = '';
    if (view === 'week') baseLabel = 'Week Total';
    else if (view === 'year') baseLabel = 'Year Total';
    else baseLabel = 'All Time';
    
    if (showInvoicedAsWell && uninvoicedCount !== totalCount) {
      return `${baseLabel} (${uninvoicedCount} uninvoiced)`;
    }
    
    return baseLabel;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const totals = calculateTotals();

  return (
    <div className='flex-start-start flex-column full-width'>
      {showCalculations && (
        <div className='flex-center-spacebetween calculated-time-wrapper full-width'>
          <div className='flex-center-start'>
            <button onClick={() => setView('week')} className={view === 'week' ? '' : 'system-button'}> Week </button>
            <button onClick={() => setView('year')} className={view === 'year' ? '' : 'system-button'}> Year </button>
            <button onClick={() => setView('total')} className={view === 'total' ? '' : 'system-button'}> Total </button>
            <label className='checkbox-wrapper'>
              <input 
                type="checkbox" 
                checked={showInvoicedAsWell} 
                onChange={(e) => setShowInvoicedAsWell(e.target.checked)}
                role="switch"
                aria-checked={showInvoicedAsWell}
              />
              <span className="switch-label">Show Invoiced?</span>
            </label>
            {allowProjectSelection && (
              <div style={{ marginLeft: '20px' }}>
                <SearchAndSelectClient
                  selectedClient={selectedFilter}
                  onClientSelect={handleClientSelect}
                />
              </div>
            )}
            {selectedFilter && hasFixedFilter && (
              <div style={{ marginLeft: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{whiteSpace: 'nowrap'}}>Filtering by:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: selectedFilter.project_color
                    }}
                  />
                  <span style={{whiteSpace: 'nowrap'}}>{selectedFilter.project_name}</span>
                </div>
              </div>
            )}
            {selectedEntries.length > 0 && (
              <button 
                onClick={handleInvoiceClick}
                style={{
                  marginLeft: '20px',
                  padding: '8px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Invoice Selected ({selectedEntries.length})
              </button>
            )}
          </div>

          <div className='flex-end-end flex-column'>
            <p className='no-text-spacing'>{getViewLabel()}</p>
            <h3 className='time-tracker-time no-text-spacing'>{formatTime(totals.totalSeconds)}</h3>
            {billableRate && totals.totalAmount && ( <h3 className='no-text-spacing' style={{color: 'green'}}> ${totals.totalAmount} </h3> )}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div>No completed time entries yet.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>
                <input 
                  type="checkbox" 
                  checked={
                    entries.filter(e => e.invoice_id == null).length > 0 && 
                    selectedEntries.length === entries.filter(e => e.invoice_id == null).length
                  }
                  onChange={handleSelectAll}
                />
              </th>
              <th>Description</th>
              <th>Project</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Duration</th>
              <th>Billable</th>
              <th>Invoice</th>
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const projectData = entry.projectData;
              return (
                <tr key={entry.id} style={{ borderBottom: '1px solid #eee', opacity: entry.invoice_id === null ? "1" : "0.5" }}>
                  <td style={{ padding: '10px' }}>
                    <input 
                      type="checkbox"
                      checked={selectedEntries.includes(entry.id)}
                      onChange={() => handleSelectEntry(entry.id)}
                      disabled={entry.invoice_id !== null}
                    />
                  </td>
                  <td>{entry.description || 'No description'}</td>
                  <td style={{ padding: '10px' }}>
                    {projectData ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className='circle-wrapper'>
                        <div style={{ backgroundColor: projectData.color }} className='circle' />
                        <span>{projectData.project_name}</span>
                      </div>
                    ) : (
                      <span>N/A</span>
                    )}
                  </td>
                  
                  <td><p className='nowrap'>{formatDate(entry.start_time)}</p></td>
                  <td><p className='nowrap'>{entry.end_time ? formatDate(entry.end_time) : 'N/A'}</p></td>
                  <td><p><strong>{formatTime(entry.time_lapsed)}</strong></p></td>
                  <td><p className='no-text-spacing' style={{ opacity: entry.billable ? '1' : '0.25', fontSize: '32px', lineHeight: '0', marginTop: '2px', color: entry.billable ? 'green' : 'black' }} > $ </p></td>
                  <td>{entry.invoice_id}</td>
                  <td style={{ padding: '10px' }}>
                    <EditTimeEntry entry={entry} onEntryUpdated={fetchEntries} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showInvoiceModal && (
        <InvoiceTimeEntries 
          entries={getSelectedEntriesData()} 
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedEntries([]);
            fetchEntries();
          }}
        />
      )}
    </div>
  );
}