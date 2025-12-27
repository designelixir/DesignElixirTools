'use client';

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Invoice } from '@/types/globalTypes';
import Image from 'next/image';

interface InvoicePDFPreviewProps {
  invoiceId: string;
}

export interface InvoicePDFPreviewRef {
  refresh: () => void;
}

const InvoicePDFPreview = forwardRef<InvoicePDFPreviewRef, InvoicePDFPreviewProps>(
  ({ invoiceId }, ref) => {
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);

    useImperativeHandle(ref, () => ({
      refresh: fetchInvoice
    }));

    useEffect(() => {
      fetchInvoice();
    }, [invoiceId]);

    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();

        if (invoiceError) throw invoiceError;
        setInvoice(invoiceData);
      } catch (err) {
        console.error('Error fetching invoice:', err);
      } finally {
        setLoading(false);
      }
    };

    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    const formatTime = (seconds: number): string => {
      const hours = (seconds / 3600).toFixed(1);
      return hours;
    };

    const calculateTimeTotal = (): number => {
      if (!invoice?.project_hourly || !invoice?.time_entries_sum) return 0;
      const hours = invoice.time_entries_sum / 3600;
      return hours * invoice.project_hourly;
    };

    const calculateSubtotal = (): number => {
      const timeTotal = calculateTimeTotal();
      const lineItemsTotal = invoice?.line_items_total || 0;
      return timeTotal + lineItemsTotal;
    };

    const calculateGrandTotal = (): number => {
      const subtotal = calculateSubtotal();
      const projectCosts = invoice?.project_costs || 0;
      const adjustments = invoice?.adjustments || 0;
      const fees = invoice?.fees || 0;
      return subtotal + projectCosts + adjustments - fees;
    };

    if (loading) {
      return <div>Loading invoice preview...</div>;
    }

    if (!invoice) {
      return <div>Invoice not found</div>;
    }

    return (
      <div style={{
        width: '816px', // 8.5 inches at 96 DPI
        minHeight: '1056px', // 11 inches at 96 DPI
        margin: '0 auto',
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#333399',
          padding: '0px 25px',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '42px', fontFamily: 'Greycliff-CF, sans-serif' }}>
            Project Invoice
          </h1>
          <div style={{ textAlign: 'right' }}>
            <Image src="/DE-Full-Logo.svg" alt="Design Elixir" width={200} height={120} />
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '40px' }}>
          {/* Date */}
          <p style={{ 
            color: '#333399', 
            fontSize: '18px', 
            fontWeight: 'bold',
            marginBottom: '30px'
          }}>
            {formatDate(invoice.invoice_date)}
          </p>

          {/* Bill To / From */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '40px'
          }}>
            <div>
              <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Bill To:</p>
              <p style={{ color: '#333399', fontSize: '20px', fontWeight: 'bold', margin: '5px 0' }}>
                {invoice.project_name}
              </p>
              <p style={{ margin: '3px 0' }}>{invoice.client_first} {invoice.client_last}</p>
              <p style={{ margin: '3px 0' }}>{invoice.client_email}</p>
              {invoice.client_phone && <p style={{ margin: '3px 0' }}>{invoice.client_phone}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>From:</p>
              <p style={{ color: '#333399', fontSize: '20px', fontWeight: 'bold', margin: '5px 0' }}>
                Design Elixir
              </p>
              <p style={{ margin: '3px 0' }}>Megan Byers</p>
              <p style={{ margin: '3px 0' }}>megan@designelixir.studio</p>
              <p style={{ margin: '3px 0' }}>303.960.1941</p>
            </div>
          </div>

          {/* Billing Summary */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ color: '#333399', marginBottom: '15px' }}>Billing Summary</h2>
            
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              backgroundColor: '#f9f9f9'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#d4d4e8' }}>
                  <th style={{ 
                    padding: '12px', 
                    textAlign: 'left',
                    color: '#333399',
                    fontWeight: 'bold'
                  }}>Description</th>
                  <th style={{ 
                    padding: '12px', 
                    textAlign: 'left',
                    color: '#333399',
                    fontWeight: 'bold'
                  }}>Type</th>
                  <th style={{ 
                    padding: '12px', 
                    textAlign: 'right',
                    color: '#333399',
                    fontWeight: 'bold'
                  }}>Price</th>
                  <th style={{ 
                    padding: '12px', 
                    textAlign: 'right',
                    color: '#333399',
                    fontWeight: 'bold'
                  }}>Qty</th>
                  <th style={{ 
                    padding: '12px', 
                    textAlign: 'right',
                    color: '#333399',
                    fontWeight: 'bold'
                  }}>Total</th>
                </tr>
              </thead>
              <tbody>
                

                {/* Line items */}
                {invoice.line_items && invoice.line_items.map((item, index) => (
                  <tr key={index}>
                    <td style={{ padding: '12px' }}>{item.line_item_description}</td>
                    <td style={{ padding: '12px' }}>{item.hourly ? 'hourly' : 'fixed'}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      ${item.rate.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {item.multiplier}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      ${item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes and Totals */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: '40px'
          }}>
            <div style={{ width: '50%' }}>
              <p style={{ color: '#333399', fontWeight: 'bold', marginBottom: '5px' }}>Notes:</p>
              <p style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {invoice.notes || 'Thank you for your business!'}
              </p>
              
            </div>
            <div style={{ width: '40%' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid #e0e0e0'
              }}>
                <span>Subtotal</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              {invoice.project_costs !== 0 && invoice.project_costs != null && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  <span>Project Costs</span>
                  <span>${(invoice.project_costs || 0).toFixed(2)}</span>
                </div>
              )}
              {invoice.adjustments !== 0 && invoice.adjustments != null && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  <span>Adjustments {invoice.adjustments_descriptor && `(${invoice.adjustments_descriptor})`}</span>
                  <span>${(invoice.adjustments || 0).toFixed(2)}</span>
                </div>
              )}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '12px 0',
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#333399'
              }}>
                <span>Invoice Total</span>
                <span>${calculateGrandTotal().toFixed(2)}</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '8px 0',
                fontSize: '14px'
              }}>
                <span>Balance Due By</span>
                <span>{formatDate(invoice.invoice_due)}</span>
              </div>
            </div>
            
          </div>
{/* Payment Info */}
            <div className='flex-start-spacebetween'>
            <div >
                <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Pay Online via Credit Card</p>
                <p style={{ margin: '3px 0' }}>PayPal - mrbyers54@gmail.com</p>
                <p style={{ margin: '3px 0' }}>Venmo - @mrbyers54</p>
                <p style={{ margin: '3px 0' }}>Zelle * - (303) 960-1941</p>
                <p style={{ fontSize: '12px', marginTop: '10px' }}>*Preferred Method</p>
            </div>

            <div>
                <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Please make all checks payable to:</p>
                <p>Megan Byers <br></br>
                6451 E Highway 82, Unit D<br></br>
                Twin Lakes, CO, 81251</p>
            </div>
            </div>
            

          {/* Status Badge */}
          {invoice.paid && (
            <div style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              padding: '15px',
              borderRadius: '4px',
              marginTop: '20px',
              textAlign: 'center',
              fontWeight: 'bold'
            }}>
              ✓ PAID {invoice.date_payment_received && `on ${formatDate(invoice.date_payment_received)}`}
              {invoice.payment_method && ` via ${invoice.payment_method}`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '20px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#666',
          position: 'absolute',
          bottom: 0,
          width: '100%'
        }}>
          <p>Happy with your services? <a href="https://bit.ly/leaveDEreview" style={{ color: '#333399' }}>Click here</a> to leave a review for Design Elixir on Google. Thanks!</p>
          <p style={{ marginTop: '10px' }}>Copyright Design Elixir {new Date().getFullYear()} ©</p>
        </div>
      </div>
    );
  }
);

InvoicePDFPreview.displayName = 'InvoicePDFPreview';

export default InvoicePDFPreview;