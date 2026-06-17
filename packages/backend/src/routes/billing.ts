import { Router } from 'express';
import { prisma } from '../config/db';
import { validateToken } from '../middleware/auth';

const router = Router();
router.use(validateToken);

// Get invoices for patient
router.get('/invoices/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const invoices = await prisma.invoice.findMany({
      where: { patientId },
      include: { lineItems: true, payments: true, appointment: true },
      orderBy: { issueDate: 'desc' }
    });
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch invoices', details: error.message });
  }
});

// Create Invoice
router.post('/invoices', async (req, res) => {
  try {
    const { patientId, appointmentId, status, dueDate, lineItems } = req.body;
    
    // Auto-generate invoice number
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const subtotal = lineItems.reduce((acc: number, item: any) => acc + item.total, 0);
    const tax = 0; // Simple for now
    const total = subtotal + tax;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        patientId,
        appointmentId,
        status: status || 'DRAFT',
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal,
        tax,
        total,
        lineItems: {
          create: lineItems.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          }))
        }
      },
      include: { lineItems: true }
    });

    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create invoice', details: error.message });
  }
});

// Add Payment
router.post('/invoices/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method, reference } = req.body;
    
    const payment = await prisma.payment.create({
      data: {
        invoiceId: id,
        amount,
        method,
        reference
      }
    });

    // Check if fully paid
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true }
    });
    if (invoice) {
      const totalPaid = invoice.payments.reduce((acc, p) => acc + p.amount, 0);
      if (totalPaid >= invoice.total) {
        await prisma.invoice.update({
          where: { id },
          data: { status: 'PAID' }
        });
      }
    }

    res.status(201).json(payment);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add payment', details: error.message });
  }
});

// Delete invoice
router.delete('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.invoice.delete({ where: { id } });
    res.json({ message: 'Invoice deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete invoice', details: error.message });
  }
});

export default router;
