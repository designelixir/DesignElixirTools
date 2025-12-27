'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Invoice } from '@/types/globalTypes';
import Link from 'next/link';

interface InvoiceListProps {
  clientId?: string;
  projectId?: string;
  showCreateButton?: boolean;
}

export default function InvoiceList({ clientId, projectId, showCreateButton = true }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('unpaid');

  useEffect(() => {
    fetchInvoices();
  }, [filterPaid, clientId, projectId]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by client_id if provided
      if (clientId) {
        query = query.eq('client_id', parseInt(clientId));
      }

      // Filter by project_id if provided
      if (projectId) {
        query = query.eq('project_id', parseInt(projectId));
      }

      // Filter by payment status
      if (filterPaid === 'paid') {
        query = query.eq('paid', true);
      } else if (filterPaid === 'unpaid') {
        query = query.eq('paid', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
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

  const calculateTimeTotal = (invoice: Invoice): number => {
    if (!invoice.project_hourly || !invoice.time_entries_sum) return 0;
    const hours = invoice.time_entries_sum / 3600;
    return hours * invoice.project_hourly;
  };

  const calculateGrandTotal = (invoice: Invoice): number => {
    const timeTotal = calculateTimeTotal(invoice);
    const lineItemsTotal = invoice.line_items_total || 0;
    const projectCosts = invoice.project_costs || 0;
    const adjustments = invoice.adjustments || 0;
    const fees = invoice.fees || 0;
    
    return timeTotal + lineItemsTotal + projectCosts + adjustments - fees;
  };

  if (loading) {
    return <div>Loading invoices...</div>;
  }

  return (
    <div className="flex-start-start flex-column full-width">
      {showCreateButton && (
        <div className="flex-center-spacebetween full-width" style={{ marginBottom: '20px' }}>
          <h2>
            {filterPaid === 'all' && 'All Invoices'}
            {filterPaid === 'unpaid' && 'Unpaid Invoices'}
            {filterPaid === 'paid' && 'Paid Invoices'}
        </h2>
          <Link href="/invoices/create">
            <button>Create Invoice</button>
          </Link>
        </div>
      )}

      <div className="flex-center-start" style={{ gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setFilterPaid('all')} 
          className={filterPaid === 'all' ? '' : 'system-button'}
        >
          All
        </button>
        <button 
          onClick={() => setFilterPaid('unpaid')} 
          className={filterPaid === 'unpaid' ? '' : 'system-button'}
        >
          Unpaid
        </button>
        <button 
          onClick={() => setFilterPaid('paid')} 
          className={filterPaid === 'paid' ? '' : 'system-button'}
        >
          Paid
        </button>
      </div>

      {invoices.length === 0 ? (
        <p>No invoices found.</p>
      ) : (
        <table className="full-width">
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Client</th>
              <th>Project</th>
              <th>Time Total</th>
              <th>Time Amount</th>
              <th>Line Items</th>
              <th>Grand Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const timeTotal = calculateTimeTotal(invoice);
              const grandTotal = calculateGrandTotal(invoice);

              return (
                <tr key={invoice.id} style={{ opacity: invoice.paid ? 0.6 : 1 }}>
                  <td>
                    <Link href={`/invoices/${invoice.id}`}>
                      <strong>{invoice.id}</strong>
                    </Link>
                  </td>
                  <td>
                    {invoice.client_first} {invoice.client_last}
                  </td>
                  <td>{invoice.project_name || 'N/A'}</td>
                  <td>
                    <strong>{formatTime(invoice.time_entries_sum)}</strong>
                  </td>
                  <td>
                    {invoice.project_hourly ? (
                      <span style={{ color: 'green' }}>
                        ${timeTotal.toFixed(2)}
                      </span>
                    ) : (
                      <span>N/A</span>
                    )}
                  </td>
                  <td>
                    <span style={{ color: 'green' }}>
                      ${invoice.line_items_total?.toFixed(2) || '0.00'}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: 'green', fontSize: '16px' }}>
                      ${grandTotal.toFixed(2)}
                    </strong>
                  </td>
                  <td>
                    {invoice.paid ? (
                      <span style={{ color: 'green', fontWeight: 'bold' }}>✓ Paid</span>
                    ) : (
                      <span style={{ color: 'orange', fontWeight: 'bold' }}>Unpaid</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/invoices/${invoice.id}`}>
                      <button className="system-button">View</button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}