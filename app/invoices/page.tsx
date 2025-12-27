'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Invoice } from '@/types/globalTypes';
import InvoiceList from './InvoiceList';

export default function InvoicesPage() {
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [totalLineItems, setTotalLineItems] = useState(0);
  const [totalTimeAmount, setTotalTimeAmount] = useState(0);
  const [totalTimeSeconds, setTotalTimeSeconds] = useState(0);
  const [averageHourlyRate, setAverageHourlyRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoiceStats();
  }, []);

  const loadInvoiceStats = async () => {
    try {
      const supabase = createClient();
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*');

      if (error) throw error;

      const unpaid = invoices?.filter(inv => !inv.paid) || [];
      
      setUnpaidCount(unpaid.length);
      setTotalCount(invoices?.length || 0);

      // Calculate totals
      let lineItemsSum = 0;
      let timeAmountSum = 0;
      let totalSeconds = 0;

      invoices?.forEach(invoice => {
        // Line items total
        lineItemsSum += invoice.line_items_total || 0;

        // Time amount (hours × hourly_rate)
        if (invoice.project_hourly && invoice.time_entries_sum) {
          const hours = invoice.time_entries_sum / 3600;
          const timeAmount = hours * invoice.project_hourly;
          timeAmountSum += timeAmount;
          totalSeconds += invoice.time_entries_sum;
        }
      });

      setTotalLineItems(lineItemsSum);
      setTotalTimeAmount(timeAmountSum);
      setTotalTimeSeconds(totalSeconds);

      // Calculate average hourly rate: total money earned / total hours worked
      if (totalSeconds > 0) {
        const totalHours = totalSeconds / 3600;
        setAverageHourlyRate(lineItemsSum / totalHours);
      }
    } catch (err) {
      console.error('Error loading invoice stats:', err);
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

  if (loading) {
    return <section className="basic-padding">Loading...</section>;
  }

  return (
    <section className="basic-padding">
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Invoices</h1>
        <div style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
          <p style={{ margin: '3px 0' }}>
            <strong>{unpaidCount} / {totalCount}</strong> unpaid invoices
          </p>
          <p style={{ margin: '3px 0' }}>
            Total Line Items: <strong style={{ color: '#2196F3' }}>${totalLineItems.toFixed(2)}</strong>
          </p>
          <p style={{ margin: '3px 0' }}>
            Total Time: <strong style={{ color: '#9C27B0' }}>{formatTime(totalTimeSeconds)}</strong>
          </p>
          <p style={{ margin: '3px 0' }}>
            Total Time Amount: <strong style={{ color: '#4CAF50' }}>${totalTimeAmount.toFixed(2)}</strong>
          </p>
          <p style={{ margin: '3px 0' }}>
            Average Hourly Rate: <strong style={{ color: '#FF9800' }}>${averageHourlyRate.toFixed(2)}/hr</strong>
          </p>
        </div>
      </div>
      <InvoiceList showCreateButton={true} />
    </section>
  );
}