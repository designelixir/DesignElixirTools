'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Invoice, LineItem, TimeEntry } from '@/types/globalTypes';
import SearchAndSelectClient from '../components/SearchAndSelectClient';
import SelectableCalendar from '../components/SelectableCalendar';
import { SelectedClientData } from '@/types/globalTypes';
import Image from 'next/image';

interface EditInvoiceProps {
  invoice: Invoice;
  onSave: () => void;
}

export default function EditInvoice({ invoice, onSave }: EditInvoiceProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SelectedClientData | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [availableTimeEntries, setAvailableTimeEntries] = useState<TimeEntry[]>([]);
  const [showAvailableEntries, setShowAvailableEntries] = useState(false);
  const [formData, setFormData] = useState({
    start_date: new Date(),
    end_date: new Date(),
    invoice_date: new Date(),
    invoice_due: new Date(),
    project_costs: '',
    adjustments: '',
    adjustments_descriptor: '',
    notes: '',
    private_notes: '',
    paid: false,
    payment_method: '',
    fees: '',
    date_payment_received: null as Date | null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInvoiceData();
  }, [invoice]);

  const loadInvoiceData = async () => {
    // Set line items
    setLineItems(invoice.line_items || []);
    
    // Set selected client
    if (invoice.client_id && invoice.project_id) {
      setSelectedClient({
        client_id: invoice.client_id.toString(),
        client_name: `${invoice.client_first} ${invoice.client_last}`,
        client_first: invoice.client_first,
        client_last: invoice.client_last,
        project_id: invoice.project_id?.toString() || '',
        project_name: invoice.project_name || '',
        project_color: '#333399'
      });
    }

    // Set form data
    setFormData({
      start_date: invoice.start_date ? new Date(invoice.start_date) : new Date(),
      end_date: invoice.end_date ? new Date(invoice.end_date) : new Date(),
      invoice_date: invoice.invoice_date ? new Date(invoice.invoice_date) : new Date(),
      invoice_due: invoice.invoice_due ? new Date(invoice.invoice_due) : new Date(),
      project_costs: invoice.project_costs?.toString() || '',
      adjustments: invoice.adjustments?.toString() || '',
      adjustments_descriptor: invoice.adjustments_descriptor || '',
      notes: invoice.notes || '',
      private_notes: invoice.private_notes || '',
      paid: invoice.paid || false,
      payment_method: invoice.payment_method || '',
      fees: invoice.fees?.toString() || '',
      date_payment_received: invoice.date_payment_received ? new Date(invoice.date_payment_received) : null
    });

    // Fetch time entries
    if (invoice.time_entries && invoice.time_entries.length > 0) {
      const supabase = createClient();
      const { data: entriesData } = await supabase
        .from('time-tracking')
        .select('*')
        .in('id', invoice.time_entries);

      if (entriesData) {
        setTimeEntries(entriesData);
      }
    }

    // Fetch available time entries for this client
    await loadAvailableTimeEntries();
  };

  const loadAvailableTimeEntries = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('time-tracking')
        .select('*')
        .eq('client_id', invoice.client_id)
        .is('invoice_id', null)
        .eq('tracking_finished', true)
        .order('start_time', { ascending: false });

      setAvailableTimeEntries(data || []);
    } catch (err) {
      console.error('Error loading available time entries:', err);
    }
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, {
      line_item_description: '',
      hourly: true,
      rate: 0,
      multiplier: 1,
      total: 0
    }]);
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'rate' || field === 'multiplier') {
      updated[index].total = updated[index].rate * updated[index].multiplier;
    }
    
    setLineItems(updated);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleRemoveTimeEntry = (entryId: string) => {
    setTimeEntries(timeEntries.filter(e => e.id !== entryId));
  };

  const handleAddTimeEntry = (entry: TimeEntry) => {
    setTimeEntries([...timeEntries, entry]);
    setAvailableTimeEntries(availableTimeEntries.filter(e => e.id !== entry.id));
  };

  const calculateLineItemsTotal = (): number => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTimeEntriesSum = (): number => {
    return timeEntries.reduce((sum, entry) => sum + (entry.time_lapsed || 0), 0);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // Fetch updated client data if client changed
      let clientData = {
        client_id: invoice.client_id,
        client_first: invoice.client_first,
        client_last: invoice.client_last,
        client_email: invoice.client_email,
        client_phone: invoice.client_phone,
        project_id: invoice.project_id,
        project_name: invoice.project_name,
        project_hourly: invoice.project_hourly
      };

      if (selectedClient) {
        const { data: client } = await supabase
          .from('clients')
          .select('*')
          .eq('id', selectedClient.client_id)
          .single();

        if (selectedClient.project_id) {
          const { data: project } = await supabase
            .from('projects')
            .select('*')
            .eq('id', selectedClient.project_id)
            .single();

          clientData = {
            client_id: parseInt(selectedClient.client_id),
            client_first: selectedClient.client_first,
            client_last: selectedClient.client_last,
            client_email: client?.client_email || '',
            client_phone: client?.client_phone || null,
            project_id: parseInt(selectedClient.project_id),
            project_name: selectedClient.project_name,
            project_hourly: project?.hourly_rate || null
          };
        }
      }

      const timeEntryIds = timeEntries.map(e => parseInt(e.id));

      const updateData = {
        ...clientData,
        start_date: formData.start_date.toISOString(),
        end_date: formData.end_date.toISOString(),
        invoice_date: formData.invoice_date.toISOString(),
        invoice_due: formData.invoice_due.toISOString(),
        time_entries: timeEntryIds,
        time_entries_sum: calculateTimeEntriesSum(),
        line_items: lineItems,
        line_items_total: calculateLineItemsTotal(),
        project_costs: formData.project_costs ? parseFloat(formData.project_costs) : 0,
        adjustments: formData.adjustments ? parseFloat(formData.adjustments) : 0,
        adjustments_descriptor: formData.adjustments_descriptor || null,
        notes: formData.notes || null,
        private_notes: formData.private_notes || null,
        paid: formData.paid,
        payment_method: formData.paid ? formData.payment_method : null,
        fees: formData.fees ? parseFloat(formData.fees) : 0,
        date_payment_received: formData.paid && formData.date_payment_received 
          ? formData.date_payment_received.toISOString() 
          : null
      };

      const { error: updateError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      // Update invoice_id on time entries
      await supabase
        .from('time-tracking')
        .update({ invoice_id: invoice.id })
        .in('id', timeEntryIds);

      // Clear invoice_id from removed entries
      const removedEntryIds = invoice.time_entries.filter(id => !timeEntryIds.includes(id));
      if (removedEntryIds.length > 0) {
        await supabase
          .from('time-tracking')
          .update({ invoice_id: null })
          .in('id', removedEntryIds);
      }

      setIsEditing(false);
      onSave();
    } catch (err: any) {
      console.error('Error saving invoice:', err);
      setError(err.message || 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatTime = (seconds: number | null | undefined): string => {
    if (!seconds || seconds === 0) return '00:00:00';
    try {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } catch {
      return '00:00:00';
    }
  };

  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return 'Invalid date';
    }
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

  return (
    <div style={{ 
      flex: '0 0 400px',
      backgroundColor: '#f9f9f9',
      padding: '20px',
      borderRadius: '8px',
      maxHeight: '90vh',
      overflow: 'auto'
    }}>
      <div className="flex-center-spacebetween" style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Invoice Data</h2>
        <div className='flex-center-end' style={{ gap: '10px', marginTop: '25px' }}>
            {isEditing ? (
                <button onClick={handleSave} disabled={loading}> {loading ? 'Saving...' : 'Save Changes'} </button>
            ) : (
                <>
                <label className="switch">
                    <input
                    type="checkbox"
                    checked={isEditing}
                    onChange={(e) => setIsEditing(e.target.checked)}
                    />
                    <span className="slider"></span>
                </label>
                <span style={{ fontWeight: 'bold' }}>Edit</span>
                </>
            )}
        </div>
        </div>
      
      <div style={{ fontSize: '14px' }}>
        {/* ID - Not editable */}
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#333399' }}>id:</strong>
          <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
            {invoice.id}
          </div>
        </div>

        {/* Created At - Not editable */}
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#333399' }}>created_at:</strong>
          <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
            {formatDate(invoice.created_at)}
          </div>
        </div>

        {/* Client & Project */}
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#333399' }}>Client & Project:</strong>
          {isEditing ? (
            <div style={{ marginTop: '5px' }}>
              <SearchAndSelectClient
                selectedClient={selectedClient}
                onClientSelect={setSelectedClient}
              />
            </div>
          ) : (
            <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              {invoice.client_first} {invoice.client_last} - {invoice.project_name || 'No project'}
            </div>
          )}
        </div>

        {/* Start Date */}
<div style={{ marginBottom: '15px' }}>
  <strong style={{ color: '#333399' }}>start_date:</strong>
  {isEditing ? (
    <input
      type="date"
      value={formData.start_date.toISOString().split('T')[0]}
      onChange={(e) => setFormData({ ...formData, start_date: new Date(e.target.value) })}
      style={{ width: '100%', marginTop: '5px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
    />
  ) : (
    <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
      {formatDate(invoice.start_date)}
    </div>
  )}
</div>

{/* End Date */}
<div style={{ marginBottom: '15px' }}>
  <strong style={{ color: '#333399' }}>end_date:</strong>
  {isEditing ? (
    <input
      type="date"
      value={formData.end_date.toISOString().split('T')[0]}
      onChange={(e) => setFormData({ ...formData, end_date: new Date(e.target.value) })}
      style={{ width: '100%', marginTop: '5px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
    />
  ) : (
    <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
      {formatDate(invoice.end_date)}
    </div>
  )}
</div>

{/* Invoice Date */}
<div style={{ marginBottom: '15px' }}>
  <strong style={{ color: '#333399' }}>invoice_date:</strong>
  {isEditing ? (
    <input
      type="date"
      value={formData.invoice_date.toISOString().split('T')[0]}
      onChange={(e) => setFormData({ ...formData, invoice_date: new Date(e.target.value) })}
      style={{ width: '100%', marginTop: '5px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
    />
  ) : (
    <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
      {formatDate(invoice.invoice_date)}
    </div>
  )}
</div>

{/* Invoice Due */}
<div style={{ marginBottom: '15px' }}>
  <strong style={{ color: '#333399' }}>invoice_due:</strong>
  {isEditing ? (
    <input
      type="date"
      value={formData.invoice_due.toISOString().split('T')[0]}
      onChange={(e) => setFormData({ ...formData, invoice_due: new Date(e.target.value) })}
      style={{ width: '100%', marginTop: '5px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
    />
  ) : (
    <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
      {formatDate(invoice.invoice_due)}
    </div>
  )}
</div>

        {/* Time Entries */}
        <div style={{ marginBottom: '15px' }}>
          <div className="flex-center-spacebetween">
            <strong style={{ color: '#333399' }}>time_entries ({timeEntries.length}):</strong>
            {isEditing && (
              <button 
                onClick={() => setShowAvailableEntries(!showAvailableEntries)}
                className="system-button"
                style={{ fontSize: '12px', padding: '4px 8px' }}
              >
                {showAvailableEntries ? 'Hide' : 'Add'} Entries
              </button>
              
            )}
            
          </div>
          {showAvailableEntries && availableTimeEntries.length > 0 && (
              <div style={{ 
                marginTop: '10px', 
                padding: '10px', 
                backgroundColor: '#e3f2fd', 
                borderRadius: '4px',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                <strong style={{ fontSize: '12px' }}>Available Time Entries:</strong>
                {availableTimeEntries.map((entry) => {
                  const projectData = parseProject(entry.project);
                  return (
                    <div key={entry.id} style={{ 
                      padding: '8px', 
                      backgroundColor: 'white', 
                      borderRadius: '4px',
                      marginTop: '5px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div><strong>{projectData?.project_name || 'N/A'}</strong></div>
                        <div>{entry.description}</div>
                        <div style={{ color: '#666' }}>
                          {formatDateTime(entry.start_time)} → {formatDateTime(entry.end_time)}
                        </div>
                        <div style={{ color: 'green', fontWeight: 'bold' }}>{formatTime(entry.time_lapsed)}</div>
                      </div>
                      <button 
                        onClick={() => handleAddTimeEntry(entry)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer',
                          fontSize: '18px',
                          color: '#4CAF50'
                        }}
                      >
                        +
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          <div style={{ marginTop: '5px' }}>
            {timeEntries.map((entry) => {
                const projectData = parseProject(entry.project);
                return (
                    <div key={entry.id} style={{ 
                    padding: '8px', 
                    backgroundColor: 'white', 
                    borderRadius: '4px',
                    marginBottom: '5px',
                    borderLeft: projectData?.project_color ? `5px solid ${projectData.project_color}` : '5px solid #ccc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px'
                    }}>
                    <div style={{ flex: 1 }}>
                        <div><strong>{projectData?.project_name || 'N/A'}</strong></div>
                        <div>{entry.description}</div>
                        <div style={{ color: '#666' }}>
                        {formatDateTime(entry.start_time)} → {formatDateTime(entry.end_time)}
                        </div>
                        <div style={{ color: 'green', fontWeight: 'bold' }}>{formatTime(entry.time_lapsed)}</div>
                    </div>
                    {isEditing && (
                        <button 
                        onClick={() => handleRemoveTimeEntry(entry.id)}
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            fontSize: '18px',
                            color: '#ff0000'
                        }}
                        >
                        ✕
                        </button>
                    )}
                    </div>
                );
                })}
            
            

            <div style={{ marginTop: '5px', padding: '8px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
              <strong>Total: {formatTime(calculateTimeEntriesSum())}</strong>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div style={{ marginBottom: '15px' }}>
          <div className="flex-center-spacebetween">
            <strong style={{ color: '#333399' }}>line_items ({lineItems.length}):</strong>
            {isEditing && (
              <button onClick={handleAddLineItem} className="system-button" style={{ fontSize: '12px', padding: '4px 8px' }} > + Add </button>
            )}
          </div>
          <div style={{ marginTop: '5px' }}>
            {lineItems.map((item, index) => (
              <div key={index} style={{ 
                padding: '8px', 
                backgroundColor: 'white', 
                borderRadius: '4px',
                marginBottom: '5px'
              }}>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.line_item_description}
                      onChange={(e) => handleLineItemChange(index, 'line_item_description', e.target.value)}
                      style={{ width: '100%', marginBottom: '5px' }}
                    />
                    <div className="flex-start-start" style={{ gap: '5px' }}>
                      <div className='flex-start-start flex-column'>
                        <label>Hourly / Fixed</label>
                        <select value={item.hourly ? 'hourly' : 'fixed'} onChange={(e) => handleLineItemChange(index, 'hourly', e.target.value === 'hourly')} style={{ flex: 1 }} >
                            <option value="hourly">Hourly</option>
                            <option value="fixed">Fixed</option>
                        </select>
                      </div>
                      <div className='flex-start-start flex-column'>
                        <label>Rate / Price $</label>
                        <input
                            type="number"
                            placeholder="Rate"
                            value={item.rate}
                            onChange={(e) => handleLineItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                            style={{ flex: 1 }}
                        />
                    </div>
                    <div className='flex-start-start flex-column'>
                        <label>Multiplier (hours)</label>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.multiplier}
                        onChange={(e) => handleLineItemChange(index, 'multiplier', parseFloat(e.target.value) || 0)}
                        style={{ flex: 1 }}
                      />
                      </div>
                      <button onClick={() => handleRemoveLineItem(index)} className='transparent-button red-text' > ✕ </button>
                    </div>
                    <div style={{ marginTop: '5px', fontWeight: 'bold' }}>
                      Total: ${item.total.toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px' }}>
                    <div><strong>{item.line_item_description}</strong></div>
                    <div>{item.hourly ? 'Hourly' : 'Fixed'} - ${item.rate} × {item.multiplier} = <strong>${item.total.toFixed(2)}</strong></div>
                  </div>
                )}
              </div>
            ))}
            <div style={{ marginTop: '5px', padding: '8px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
              <strong>Total: ${calculateLineItemsTotal().toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* Project Costs */}
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#333399' }}>project_costs:</strong>
          {isEditing ? (
            <input
              type="number"
              step="0.01"
              value={formData.project_costs}
              onChange={(e) => setFormData({ ...formData, project_costs: e.target.value })}
              style={{ width: '100%', marginTop: '5px' }}
            />
          ) : (
            <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              ${invoice.project_costs || '0.00'}
            </div>
          )}
        </div>

        {/* Adjustments */}
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#333399' }}>adjustments:</strong>
          {isEditing ? (
            <>
              <input
                type="number"
                step="0.01"
                value={formData.adjustments}
                onChange={(e) => setFormData({ ...formData, adjustments: e.target.value })}
                style={{ width: '100%', marginTop: '5px' }}
              />
              <input
                type="text"
                placeholder="Description (e.g., Discount, Rush fee)"
                value={formData.adjustments_descriptor}
                onChange={(e) => setFormData({ ...formData, adjustments_descriptor: e.target.value })}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </>
          ) : (
            <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
              ${invoice.adjustments || '0.00'} {invoice.adjustments_descriptor && `(${invoice.adjustments_descriptor})`}
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#333399' }}>notes:</strong>
          {isEditing ? (
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              style={{ width: '100%', marginTop: '5px' }}
            />
          ) : (
            <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
              {invoice.notes || 'Not set'}
            </div>
          )}
        </div>

        {/* Private Notes */}
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#333399' }}>private_notes:</strong>
          {isEditing ? (
            <textarea
              value={formData.private_notes}
              onChange={(e) => setFormData({ ...formData, private_notes: e.target.value })}
              rows={3}
              style={{ width: '100%', marginTop: '5px' }}
            />
          ) : (
            <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
              {invoice.private_notes || 'Not set'}
            </div>
          )}
        </div>

        {/* Paid Status */}
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#333399' }}>paid:</strong>
          <div style={{ marginTop: '5px', padding: '8px', backgroundColor: formData.paid ? '#e8f5e9' : 'white', borderRadius: '4px' }}>
            {isEditing ? (
              <label className="switch">
                <input
                  type="checkbox"
                  checked={formData.paid}
                  onChange={(e) => setFormData({ ...formData, paid: e.target.checked })}
                />
                <span className="slider"></span>
              </label>
            ) : (
              <span>{invoice.paid ? 'Yes' : 'No'}</span>
            )}
          </div>
        </div>

        {/* Payment Details - Only show if paid */}
        {formData.paid && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <strong style={{ color: '#333399' }}>payment_method:</strong>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  placeholder="e.g., Venmo, Check, PayPal"
                  style={{ width: '100%', marginTop: '5px' }}
                />
              ) : (
                <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                  {invoice.payment_method || 'Not set'}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <strong style={{ color: '#333399' }}>date_payment_received:</strong>
              {isEditing ? (
                <div style={{ marginTop: '5px' }}>
                  <SelectableCalendar
                    value={formData.date_payment_received || new Date()}
                    onChange={(date) => setFormData({ ...formData, date_payment_received: date })}
                    label=""
                  />
                </div>
              ) : (
                <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                  {formatDate(invoice.date_payment_received)}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <strong style={{ color: '#333399' }}>fees:</strong>
              {isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  value={formData.fees}
                  onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                  style={{ width: '100%', marginTop: '5px' }}
                />
              ) : (
                <div style={{ marginTop: '5px', padding: '8px', backgroundColor: 'white', borderRadius: '4px' }}>
                  ${invoice.fees || '0.00'}
                </div>
              )}
            </div>
          </>
        )}

        {error && (
          <div style={{ 
            color: 'red', 
            backgroundColor: '#ffebee', 
            padding: '10px', 
            borderRadius: '4px', 
            marginBottom: '15px',
            fontSize: '12px'
          }}>
            {error}
          </div>
        )}

        
      </div>
    </div>
  );
}