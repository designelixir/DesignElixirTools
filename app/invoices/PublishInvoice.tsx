'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface PublishInvoiceProps {
  invoiceId: string;
  onPublish: () => void;
}

export default function PublishInvoice({ invoiceId, onPublish }: PublishInvoiceProps) {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    payment_method: '',
    date_payment_received: new Date().toISOString().split('T')[0],
    fees: ''
  });

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      setInvoice(data);
    } catch (err) {
      console.error('Error fetching invoice:', err);
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // Get the invoice's time entries
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('time_entries')
        .eq('id', invoiceId)
        .single();

      if (invoiceData && invoiceData.time_entries && invoiceData.time_entries.length > 0) {
        // Update all time entries: set invoice_id and billable = false
        const { error: updateEntriesError } = await supabase
          .from('time-tracking')
          .update({ 
            invoice_id: invoiceId,
            billable: false 
          })
          .in('id', invoiceData.time_entries);

        if (updateEntriesError) throw updateEntriesError;
      }

      // Update invoice: set draft = false
      const { error: updateInvoiceError } = await supabase
        .from('invoices')
        .update({ draft: false })
        .eq('id', invoiceId);

      if (updateInvoiceError) throw updateInvoiceError;

      await fetchInvoice();
      onPublish();
    } catch (err: any) {
      console.error('Error publishing invoice:', err);
      setError(err.message || 'Failed to publish invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    // Trigger browser print dialog
    window.print();
  };

  const handleReceivePayment = async () => {
    if (!paymentData.payment_method) {
      setError('Payment method is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          paid: true,
          payment_method: paymentData.payment_method,
          date_payment_received: new Date(paymentData.date_payment_received).toISOString(),
          fees: paymentData.fees ? parseFloat(paymentData.fees) : 0
        })
        .eq('id', invoiceId);

      if (updateError) throw updateError;

      setShowPaymentModal(false);
      await fetchInvoice();
      onPublish();
    } catch (err: any) {
      console.error('Error receiving payment:', err);
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-start-start flex-column" style={{ gap: '10px' }}>
      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffebee', 
          padding: '10px', 
          borderRadius: '4px',
          width: '100%'
        }}>
          {error}
        </div>
      )}

      {invoice.draft !== false ? (
        <button 
          onClick={handlePublish} 
          disabled={loading}
          style={{ 
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '10px 20px',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Publishing...' : 'Publish Invoice'}
        </button>
      ) : (
        <>
          <button 
            onClick={handleDownloadPDF}
            style={{ 
              backgroundColor: '#2196F3',
              color: 'white',
              padding: '10px 20px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            📄 Download PDF
          </button>

          {!invoice.paid && (
            <button 
              onClick={() => setShowPaymentModal(true)}
              style={{ 
                backgroundColor: '#FF9800',
                color: 'white',
                padding: '10px 20px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              💰 Receive Payment
            </button>
          )}

          {invoice.paid && (
            <div style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              padding: '15px',
              borderRadius: '4px',
              textAlign: 'center',
              fontWeight: 'bold'
            }}>
              ✓ PAID on {new Date(invoice.date_payment_received).toLocaleDateString()} via {invoice.payment_method}
            </div>
          )}
        </>
      )}

      {showPaymentModal && (
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
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2>Record Payment</h2>

            <div className="form-input-wrapper">
              <label>Payment Method *</label>
              <input
                type="text"
                value={paymentData.payment_method}
                onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                placeholder="e.g., Venmo, Check, PayPal"
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-input-wrapper">
              <label>Date Received *</label>
              <input
                type="date"
                value={paymentData.date_payment_received}
                onChange={(e) => setPaymentData({ ...paymentData, date_payment_received: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-input-wrapper">
              <label>Fees ($)</label>
              <input
                type="number"
                step="0.01"
                value={paymentData.fees}
                onChange={(e) => setPaymentData({ ...paymentData, fees: e.target.value })}
                placeholder="0.00"
                style={{ width: '100%' }}
              />
            </div>

            {error && (
              <div style={{ 
                color: 'red', 
                backgroundColor: '#ffebee', 
                padding: '10px', 
                borderRadius: '4px',
                marginTop: '10px'
              }}>
                {error}
              </div>
            )}

            <div className="flex-start-start" style={{ gap: '10px', marginTop: '20px' }}>
              <button onClick={handleReceivePayment} disabled={loading}>
                {loading ? 'Recording...' : 'Record Payment'}
              </button>
              <button onClick={() => setShowPaymentModal(false)} className="system-button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}