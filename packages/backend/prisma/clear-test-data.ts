import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging all patient, appointment, campaign, and dispatch logs...');

  // Delete message recipients first as they reference campaigns and patients
  const deletedRecipients = await prisma.messageRecipient.deleteMany({});
  console.log(`✓ Deleted ${deletedRecipients.count} message recipients.`);

  // Delete campaigns
  const deletedCampaigns = await prisma.campaign.deleteMany({});
  console.log(`✓ Deleted ${deletedCampaigns.count} campaigns.`);

  // Delete tags
  const deletedTags = await prisma.patientTag.deleteMany({});
  console.log(`✓ Deleted ${deletedTags.count} patient tags.`);

  // Delete clinical notes
  const deletedNotes = await prisma.clinicalNote.deleteMany({});
  console.log(`✓ Deleted ${deletedNotes.count} clinical notes.`);

  // Delete invoice items and payments
  const deletedInvoiceItems = await prisma.invoiceItem.deleteMany({});
  const deletedPayments = await prisma.payment.deleteMany({});
  const deletedInvoices = await prisma.invoice.deleteMany({});
  console.log(`✓ Deleted ${deletedInvoices.count} invoices (${deletedInvoiceItems.count} items, ${deletedPayments.count} payments).`);

  // Delete appointments
  const deletedAppointments = await prisma.appointment.deleteMany({});
  console.log(`✓ Deleted ${deletedAppointments.count} appointments.`);

  // Delete patients
  const deletedPatients = await prisma.patient.deleteMany({});
  console.log(`✓ Deleted ${deletedPatients.count} patients.`);

  console.log('🎉 Test data successfully cleared! User accounts and settings remain intact.');
}

main()
  .catch((e) => {
    console.error('Error clearing data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
