'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { TimeEntry, Invoice } from '@/types/globalTypes';

interface InvoiceTimeEntriesProps {
  entries: TimeEntry[];
  onClose: () => void;
}

export default function InvoiceTimeEntries({ entries, onClose }: InvoiceTimeEntriesProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredInvoices(invoices);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = invoices.filter(invoice => 
        invoice.id.toLowerCase().includes(term) ||
        `${invoice.client_first} ${invoice.client_last}`.toLowerCase().includes(term) ||
        (invoice.project_name && invoice.project_name.toLowerCase().includes(term))
      );
      setFilteredInvoices(filtered);
    }
  }, [searchTerm, invoices]);

  const fetchInvoices = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setInvoices(data || []);
      setFilteredInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }
  };

  const getClientInfo = () => {
    if (entries.length === 0) return null;
    
    const firstEntry = entries[0];
    const project = typeof firstEntry.project === 'string' 
      ? JSON.parse(firstEntry.project) 
      : firstEntry.project;

    return {
      client_id: firstEntry.client_id,
      client_first: project?.client_first || '',
      client_last: project?.client_last || '',
      client_email: '', // Will need to fetch from clients table
      project_id: project?.project_id,
      project_name: project?.project_name,
      project_hourly: project?.hourly_rate
    };
  };

  const calculateTotalTime = (): number => {
    return entries.reduce((sum, entry) => sum + (entry.time_lapsed || 0), 0);
  };

  const getDateRange = () => {
    // Get all start times from entries
    const dates = entries.map(e => new Date(e.start_time));
    
    // Find earliest and latest dates
    const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Set to start of day for earliest, end of day for latest
    earliestDate.setHours(0, 0, 0, 0);
    latestDate.setHours(23, 59, 59, 999);
    
    return {
      startDate: earliestDate,
      endDate: latestDate
    };
  };

  const handleCreateNewInvoice = async () => {
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const clientInfo = getClientInfo();
      
      if (!clientInfo) {
        throw new Error('No client information available');
      }

      // Fetch client details
      const { data: clientData } = await supabase
        .from('clients')
        .select('client_email, client_phone')
        .eq('id', clientInfo.client_id)
        .single();

      // Generate invoice ID: {client_id}-{mmddyyyy}
      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const year = now.getFullYear();
      const invoiceId = `${clientInfo.client_id}-${month}${day}${year}`;

      // Calculate totals
      const totalTime = calculateTotalTime();
      const entryIds = entries.map(e => parseInt(e.id));

      // Get date range from entries
      const { startDate, endDate } = getDateRange();

      // Invoice date is today
      const invoiceDate = new Date();
      invoiceDate.setHours(0, 0, 0, 0);

      // Invoice due is 14 days from invoice date
      const invoiceDue = new Date(invoiceDate);
      invoiceDue.setDate(invoiceDue.getDate() + 14);
      invoiceDue.setHours(23, 59, 59, 999);

      const invoiceData = {
        id: invoiceId,
        created_at: now.toISOString(),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        invoice_date: invoiceDate.toISOString(),
        invoice_due: invoiceDue.toISOString(),
        client_id: clientInfo.client_id,
        client_first: clientInfo.client_first,
        client_last: clientInfo.client_last,
        client_email: clientData?.client_email || '',
        client_phone: clientData?.client_phone || null,
        project_id: clientInfo.project_id || null,
        project_name: clientInfo.project_name || null,
        project_hourly: clientInfo.project_hourly || null,
        time_entries: entryIds,
        time_entries_sum: totalTime,
        line_items: [],
        line_items_total: 0,
        project_costs: 0,
        adjustments: 0,
        adjustments_descriptor: null,
        notes: null,
        paid: false,
        payment_method: null,
        fees: 0,
        date_payment_received: null,
        private_notes: null,
        draft: true
      };

      const { error: insertError } = await supabase
        .from('invoices')
        .insert([invoiceData]);

      if (insertError) throw insertError;

      // Update time entries with invoice_id
      const { error: updateError } = await supabase
        .from('time-tracking')
        .update({ invoice_id: invoiceId })
        .in('id', entryIds);

      if (updateError) throw updateError;

      router.push(`/invoices/${invoiceId}`);
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      setError(err.message || 'Failed to create invoice');
      setLoading(false);
    }
  };

  const handleAddToExistingInvoice = async () => {
    if (!selectedInvoice) return;

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const entryIds = entries.map(e => parseInt(e.id));
      const totalTime = calculateTotalTime();

      // Merge entry IDs
      const updatedEntryIds = [...selectedInvoice.time_entries, ...entryIds];
      const updatedTimeSum = selectedInvoice.time_entries_sum + totalTime;

      // Get date range from new entries
      const { startDate: newStartDate, endDate: newEndDate } = getDateRange();

      const existingStart = new Date(selectedInvoice.start_date);
      const existingEnd = new Date(selectedInvoice.end_date);

      const finalStartDate = newStartDate < existingStart ? newStartDate : existingStart;
      const finalEndDate = newEndDate > existingEnd ? newEndDate : existingEnd;

      // Update invoice
      const { error: updateInvoiceError } = await supabase
        .from('invoices')
        .update({
          time_entries: updatedEntryIds,
          time_entries_sum: updatedTimeSum,
          start_date: finalStartDate.toISOString(),
          end_date: finalEndDate.toISOString()
        })
        .eq('id', selectedInvoice.id);

      if (updateInvoiceError) throw updateInvoiceError;

      // Update time entries with invoice_id
      const { error: updateEntriesError } = await supabase
        .from('time-tracking')
        .update({ invoice_id: selectedInvoice.id })
        .in('id', entryIds);

      if (updateEntriesError) throw updateEntriesError;

      router.push(`/invoices/${selectedInvoice.id}`);
    } catch (err: any) {
      console.error('Error adding to invoice:', err);
      setError(err.message || 'Failed to add to invoice');
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-center-center" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <h2>Invoice Time Entries</h2>
        <p><strong>{entries.length}</strong> entries selected • <strong>{formatTime(calculateTotalTime())}</strong> total time</p>

        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
          <h3>Create New Invoice or Add to Existing</h3>
          
          <div className="flex-start-start flex-column" style={{ gap: '10px', marginTop: '15px' }}>
            <button onClick={handleCreateNewInvoice} disabled={loading}>
              {loading ? 'Creating...' : 'Create New Invoice'}
            </button>

            <div style={{ width: '100%', margin: '10px 0', textAlign: 'center' }}>
              <strong>OR</strong>
            </div>

            <div className="flex-start-start flex-column full-width">
              <label style={{ marginBottom: '5px' }}>Search Existing Invoices</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by invoice ID, client name, or project..."
                style={{ width: '100%', marginBottom: '10px' }}
              />

              {searchTerm && filteredInvoices.length > 0 && (
                <div style={{
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  maxHeight: '200px',
                  overflow: 'auto',
                  width: '100%'
                }}>
                  {filteredInvoices.map(invoice => (
                    <div
                      key={invoice.id}
                      onClick={() => setSelectedInvoice(invoice)}
                      style={{
                        padding: '10px',
                        cursor: 'pointer',
                        backgroundColor: selectedInvoice?.id === invoice.id ? '#e3f2fd' : 'white',
                        borderBottom: '1px solid #eee'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedInvoice?.id !== invoice.id) {
                          e.currentTarget.style.backgroundColor = '#f5f5f5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedInvoice?.id !== invoice.id) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <div><strong>{invoice.id}</strong></div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {invoice.client_first} {invoice.client_last}
                        {invoice.project_name && ` • ${invoice.project_name}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedInvoice && (
                <div style={{
                  marginTop: '15px',
                  padding: '15px',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '4px',
                  width: '100%'
                }}>
                  <p><strong>Selected Invoice:</strong> {selectedInvoice.id}</p>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    {selectedInvoice.client_first} {selectedInvoice.client_last}
                    {selectedInvoice.project_name && ` • ${selectedInvoice.project_name}`}
                  </p>
                  <button 
                    onClick={handleAddToExistingInvoice} 
                    disabled={loading}
                    style={{ marginTop: '10px' }}
                  >
                    {loading ? 'Adding...' : 'Add Entries to This Invoice'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ 
            color: 'red', 
            backgroundColor: '#ffebee', 
            padding: '10px', 
            borderRadius: '4px', 
            marginTop: '15px' 
          }}>
            {error}
          </div>
        )}

        <button onClick={onClose} className="system-button" style={{ marginTop: '20px' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}