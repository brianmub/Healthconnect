import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { messagingService } from '../services/messagingService';

export async function getAppointments(req: Request, res: Response) {
  const { from, to, patientId, status } = req.query;

  try {
    const where: any = {};

    if (patientId) {
      where.patientId = patientId as string;
    }

    if (req.query.providerId) {
      where.providerId = req.query.providerId as string;
    }

    if (status) {
      where.status = status as any;
    }

    if (from || to) {
      where.dateTime = {};
      if (from) {
        where.dateTime.gte = new Date(from as string);
      }
      if (to) {
        where.dateTime.lte = new Date(to as string);
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true, whatsapp: true, optedOut: true }
        },
        provider: true
      },
      orderBy: { dateTime: 'asc' },
    });

    res.json(appointments);
  } catch (err) {
    console.error('getAppointments error:', err);
    res.status(500).json({ error: 'Failed to retrieve appointments' });
  }
}

export async function createAppointment(req: Request, res: Response) {
  const { patientId, providerId, dateTime, duration, type, status, notes } = req.body;

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        providerId: providerId || null,
        dateTime: new Date(dateTime),
        duration: parseInt(duration, 10),
        type,
        status: status || 'SCHEDULED',
        notes,
      },
      include: { patient: true }
    });

    // Instant Booking Confirmation Automation Trigger
    res.status(201).json(appointment);
    
    // Perform trigger checking in background to keep API fast
    setTimeout(async () => {
      try {
        const rule = await prisma.automationRule.findFirst({
          where: { trigger: 'APPOINTMENT_CONFIRMATION', isActive: true },
          include: { template: true }
        });

        if (rule && !patient.optedOut) {
          const defaultAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
          if (!defaultAdmin) return;

          console.log(`🤖 Instant confirmation trigger: "${rule.name}" for patient ${patient.firstName}`);
          
          const campaign = await prisma.campaign.create({
            data: {
              name: `Auto: Confirmation - ${patient.firstName} ${patient.lastName}`,
              templateId: rule.templateId,
              channel: rule.channel,
              status: 'SENDING',
              createdById: defaultAdmin.id,
              sentAt: new Date()
            }
          });

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

          await messagingService.processIndividualMessage(recipient);
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'SENT' }
          });
        }
      } catch (err) {
        console.error('Instant confirmation trigger error:', err);
      }
    }, 0);

  } catch (err) {
    console.error('createAppointment error:', err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
}

export async function updateAppointment(req: Request, res: Response) {
  const { id } = req.params;
  const { dateTime, duration, type, status, notes, providerId } = req.body;

  try {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        dateTime: dateTime ? new Date(dateTime) : undefined,
        duration: duration ? parseInt(duration, 10) : undefined,
        providerId: providerId !== undefined ? providerId : undefined,
        type,
        status,
        notes,
      },
      include: { patient: true }
    });

    res.json(appointment);
  } catch (err) {
    console.error('updateAppointment error:', err);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
}

export async function deleteAppointment(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await prisma.appointment.delete({ where: { id } });
    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    console.error('deleteAppointment error:', err);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
}

export async function sendQuickReminder(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.patient.optedOut) {
      return res.status(400).json({ error: 'Patient has opted out of messaging' });
    }

    // Try to find a reminder template
    const template = await prisma.messageTemplate.findFirst({
      where: { category: 'REMINDER' }
    });

    if (!template) {
      return res.status(400).json({ error: 'No reminder template found. Please create one in Templates.' });
    }

    const defaultAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!defaultAdmin) {
      return res.status(500).json({ error: 'No administrator user configured.' });
    }

    // Create a mini campaign for this quick action
    const campaign = await prisma.campaign.create({
      data: {
        name: `Quick Reminder - ${appointment.patient.firstName} ${appointment.patient.lastName}`,
        templateId: template.id,
        channel: template.channel,
        status: 'SENDING',
        createdById: defaultAdmin.id,
        sentAt: new Date()
      }
    });

    const recipient = await prisma.messageRecipient.create({
      data: {
        campaignId: campaign.id,
        patientId: appointment.patient.id,
        phone: appointment.patient.phone,
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

    // Send immediately
    await messagingService.processIndividualMessage(recipient);
    
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'SENT' }
    });

    res.json({ message: 'Reminder message sent successfully' });
  } catch (err) {
    console.error('sendQuickReminder error:', err);
    res.status(500).json({ error: 'Failed to send manual reminder' });
  }
}
