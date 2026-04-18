import type { InvoiceData } from './types.ts';

export class InvoiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvoiceValidationError';
  }
}

export function validateInvoice(data: InvoiceData): void {
  if (!data.order_id) throw new InvoiceValidationError('Missing order_id');
  if (!data.client?.email) throw new InvoiceValidationError('Missing customer email');
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new InvoiceValidationError('Invoice has no items');
  }
  if (!data.totals || data.totals.total <= 0) {
    throw new InvoiceValidationError('Invalid total');
  }
  if (data.payment.status === 'paid' && !data.payment.transaction_id) {
    throw new InvoiceValidationError('Paid invoice missing transaction reference');
  }
  for (const item of data.items) {
    if (!item.name || item.quantity <= 0 || item.unit_price < 0) {
      throw new InvoiceValidationError(`Invalid line item: ${item.name}`);
    }
  }
}
