import cron from 'node-cron';
import { prisma } from '../config/db';
import { messagingService } from '../services/messagingService';

export function startAutomationCron() {
  console.log('⏰ Automation Cron Job Scheduled (runs every 5 minutes).');
  // Runs every 5 minutes: '*/5 * * * *'
  cron.schedule('*/5 * * * *', async () => {
    console.log('🤖 Running automation checks...');
    try {
      await runAutomationChecks();
    } catch (error) {
      console.error('Error during automation checks:', error);
    }
  });
}

export async function runAutomationChecks() {
  const now = new Date();

  // Fetch all active automation rules
  const activeRules = await prisma.automationRule.findMany({
    where: { isActive: true },
    include: { template: true }
  });

  // Fetch admin user to assign as campaign creator
  const defaultAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  if (!defaultAdmin) {
    console.warn('⚠️ No ADMIN user found in DB. Skipping automations.');
    return;
  }

  for (const rule of activeRules) {
    console.log(`Processing rule: "${rule.name}" (${rule.trigger})`);

    if (rule.trigger === 'APPOINTMENT_REMINDER') {
      // e.g. rule.offsetHours = -24 means 24 hours before appointment
      const offsetMs = rule.offsetHours * 60 * 60 * 1000;
      // We look for appointments where targetSendTime (appointmentDateTime + offsetHours) is <= now
      // and appointmentDateTime is in the future.
      // To avoid processing ancient appointments, we restrict appointmentDateTime to the next 48 hours.
      const maxApptTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const appointments = await prisma.appointment.findMany({
        where: {
          status: 'SCHEDULED',
          dateTime: {
            gt: now,
            lte: maxApptTime
          }
        },
        include: { patient: true }
      });

      for (const appt of appointments) {
        const targetSendTime = new Date(appt.dateTime.getTime() + offsetMs);

        if (now >= targetSendTime) {
          // Check if we already sent a message for this appointment and template
          const alreadySent = await prisma.messageRecipient.findFirst({
            where: {
              patientId: appt.patientId,
              campaign: {
                templateId: rule.templateId
              },
              createdAt: {
                gte: new Date(appt.dateTime.getTime() - 48 * 60 * 60 * 1000), // within 48h of the appointment
              }
            }
          });

          if (!alreadySent) {
            await triggerAutomationCampaign(rule, appt.patient, defaultAdmin.id);
          }
        }
      }
    }

    if (rule.trigger === 'POST_APPOINTMENT_FOLLOWUP') {
      // e.g. rule.offsetHours = 2 means 2 hours after appointment
      const offsetMs = rule.offsetHours * 60 * 60 * 1000;
      const minApptTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // within last 24 hours

      const appointments = await prisma.appointment.findMany({
        where: {
          status: 'COMPLETED',
          dateTime: {
            gte: minApptTime,
            lt: now
          }
        },
        include: { patient: true }
      });

      for (const appt of appointments) {
        const targetSendTime = new Date(appt.dateTime.getTime() + offsetMs);

        if (now >= targetSendTime) {
          const alreadySent = await prisma.messageRecipient.findFirst({
            where: {
              patientId: appt.patientId,
              campaign: {
                templateId: rule.templateId
              },
              createdAt: {
                gte: new Date(appt.dateTime.getTime()), // since the appointment started
              }
            }
          });

          if (!alreadySent) {
            await triggerAutomationCampaign(rule, appt.patient, defaultAdmin.id);
          }
        }
      }
    }

    if (rule.trigger === 'MISSED_APPOINTMENT') {
      // e.g. when status = NO_SHOW. Usually trigger immediately or after X hours
      const offsetMs = rule.offsetHours * 60 * 60 * 1000;
      const minApptTime = new Date(now.getTime() - 48 * 60 * 60 * 1000); // within last 48 hours

      const appointments = await prisma.appointment.findMany({
        where: {
          status: 'NO_SHOW',
          dateTime: {
            gte: minApptTime,
            lt: now
          }
        },
        include: { patient: true }
      });

      for (const appt of appointments) {
        const targetSendTime = new Date(appt.dateTime.getTime() + offsetMs);

        if (now >= targetSendTime) {
          const alreadySent = await prisma.messageRecipient.findFirst({
            where: {
              patientId: appt.patientId,
              campaign: {
                templateId: rule.templateId
              },
              createdAt: {
                gte: new Date(appt.dateTime.getTime()),
              }
            }
          });

          if (!alreadySent) {
            await triggerAutomationCampaign(rule, appt.patient, defaultAdmin.id);
          }
        }
      }
    }

    if (rule.trigger === 'RECALL_REMINDER') {
      // 6-month recall: Patients who haven't had an appointment in 6 months
      // we check if they have no appointment scheduled and their last appointment was completed ~6 months ago.
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const patients = await prisma.patient.findMany({
        where: {
          optedOut: false,
          appointments: {
            some: {
              status: 'COMPLETED',
              dateTime: {
                lte: sixMonthsAgo
              }
            },
            none: {
              dateTime: {
                gte: sixMonthsAgo // no appointments in the last 6 months
              }
            }
          }
        }
      });

      for (const patient of patients) {
        const alreadySent = await prisma.messageRecipient.findFirst({
          where: {
            patientId: patient.id,
            campaign: {
              templateId: rule.templateId
            },
            createdAt: {
              gte: sixMonthsAgo // already received a recall in the last 6 months
            }
          }
        });

        if (!alreadySent) {
          await triggerAutomationCampaign(rule, patient, defaultAdmin.id);
        }
      }
    }
  }
}

// Trigger a campaign for a single patient automatically
async function triggerAutomationCampaign(rule: any, patient: any, adminId: string): Promise<void> {
  console.log(`🤖 Triggering automation campaign "${rule.name}" for patient ${patient.firstName} ${patient.lastName}`);
  
  // Create a database campaign entry
  const campaign = await prisma.campaign.create({
    data: {
      name: `Auto: ${rule.name} - ${patient.firstName} ${patient.lastName}`,
      templateId: rule.templateId,
      channel: rule.channel,
      status: 'SENDING',
      createdById: adminId,
      sentAt: new Date()
    }
  });

  // Create recipient log
  const recipient = await prisma.messageRecipient.create({
    data: {
      campaignId: campaign.id,
      patientId: patient.id,
      phone: patient.phone,
      status: 'PENDING'
    },
    include: {
      patient: true,
      campaign: {
        include: {
          template: true,
          createdBy: true
        }
      }
    }
  });

  // Process sending
  try {
    await messagingService.processIndividualMessage(recipient);
    
    // Update campaign to SENT
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'SENT' }
    });
  } catch (error) {
    console.error(`Error sending automated message for recipient ${recipient.id}:`, error);
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'FAILED' }
    });
  }
}
