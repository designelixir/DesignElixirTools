'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Invoice } from '@/types/globalTypes';
import Link from 'next/link';
import InvoicePDFPreview, { InvoicePDFPreviewRef } from '../InvoicePDFPreview';
import EditInvoice from '../EditInvoice';
import PublishInvoice from '../PublishInvoice';
import EditClient from '@/app/client-list/EditClient';

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const previewRef = useRef<InvoicePDFPreviewRef>(null);
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
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

  const handleRefresh = () => {
    fetchInvoice();
    previewRef.current?.refresh();
  };

  if (loading) {
    return <div className="basic-padding">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="basic-padding">Invoice not found</div>;
  }

  return (
    <div className="basic-padding full-width">
      {/* Header */}
      <div className="flex-center-spacebetween full-width" style={{ marginBottom: '20px' }}>
        <div className='full-width'>
            <Link href="/invoices"> <h5 className='no-text-spacing'>INVOICES</h5> </Link>
            <h1 style={{ margin: 0 }}>Invoice: {invoiceId}</h1>
            <div className='flex-center-start'>
                {invoice.project_id && (
            <Link href={`/projects/${invoice.project_id}`}>
              <button className="system-button">View Project: {invoice.project_name}</button>
            </Link>
          )}
          {invoice.client_id && (
            <Link href={`/client-list/${invoice.client_id}`}>
              <button className="system-button">View Client: {invoice.client_first} {invoice.client_last}</button>
            </Link>
          )}
            </div>
        </div>
        <PublishInvoice invoiceId={invoiceId} onPublish={handleRefresh} />

      </div>

      <div className="flex-start-start">
        {/* PDF Preview */}
        <div style={{marginRight: '25px'}}>
          <InvoicePDFPreview ref={previewRef} invoiceId={invoiceId} />
        </div>

        {/* Inline Editor */}
        <div className='full-width'>
            <EditInvoice invoice={invoice} onSave={handleRefresh} />
        </div>
      </div>
    </div>
  );
}