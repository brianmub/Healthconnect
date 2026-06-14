import { Request, Response } from 'express';
import { prisma } from '../config/db';

export async function getOverview(req: Request, res: Response) {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Total Patients
    const totalPatients = await prisma.patient.count();

    // 2. Messages Sent Today
    const messagesSentToday = await prisma.messageRecipient.count({
      where: {
        sentAt: {
          gte: startOfToday,
        },
      },
    });

    // 3. Overall Delivery Rate (%)
    const totalMessages = await prisma.messageRecipient.count({
      where: {
        status: { not: 'OPT_OUT' }
      }
    });

    const deliveredMessages = await prisma.messageRecipient.count({
      where: {
        status: 'DELIVERED',
      },
    });

    // If no DELIVERED yet, check SENT as fallback for mock sending
    const sentMessages = await prisma.messageRecipient.count({
      where: {
        status: 'SENT'
      }
    });

    const successfulCount = deliveredMessages + sentMessages;
    const deliveryRate = totalMessages > 0 ? Math.round((successfulCount / totalMessages) * 100) : 100;

    // 4. Upcoming Appointments (next 7 days)
    const upcomingAppointments = await prisma.appointment.count({
      where: {
        dateTime: {
          gte: now,
          lte: sevenDaysLater,
        },
        status: { in: ['SCHEDULED', 'CONFIRMED'] }
      },
    });

    res.json({
      totalPatients,
      messagesSentToday,
      deliveryRate,
      upcomingAppointments,
    });
  } catch (err) {
    console.error('getOverview error:', err);
    res.status(500).json({ error: 'Failed to retrieve overview metrics' });
  }
}

export async function getMessagesOverTime(req: Request, res: Response) {
  const { from, to } = req.query;
  
  try {
    const endDate = to ? new Date(to as string) : new Date();
    const startDate = from ? new Date(from as string) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch message recipients in this date range
    const messages = await prisma.messageRecipient.findMany({
      where: {
        sentAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        campaign: true,
      },
      orderBy: { sentAt: 'asc' },
    });

    // Aggregate in JS (SQLite compatible and database independent)
    const aggregatedData: Record<string, { date: string; SMS: number; WHATSAPP: number }> = {};
    
    // Initialize all days in the range to 0
    let temp = new Date(startDate.getTime());
    while (temp <= endDate) {
      const dayStr = temp.toISOString().split('T')[0];
      aggregatedData[dayStr] = { date: dayStr, SMS: 0, WHATSAPP: 0 };
      temp.setDate(temp.getDate() + 1);
    }

    // Populate data
    messages.forEach((m) => {
      if (!m.sentAt) return;
      const dayStr = m.sentAt.toISOString().split('T')[0];
      if (!aggregatedData[dayStr]) {
        aggregatedData[dayStr] = { date: dayStr, SMS: 0, WHATSAPP: 0 };
      }
      
      const channel = m.campaign.channel;
      if (channel === 'SMS') {
        aggregatedData[dayStr].SMS++;
      } else if (channel === 'WHATSAPP') {
        aggregatedData[dayStr].WHATSAPP++;
      } else {
        // BOTH (resolve based on format)
        if (m.phone.startsWith('whatsapp') || m.phone.length > 13) {
          aggregatedData[dayStr].WHATSAPP++;
        } else {
          aggregatedData[dayStr].SMS++;
        }
      }
    });

    res.json(Object.values(aggregatedData));
  } catch (err) {
    console.error('getMessagesOverTime error:', err);
    res.status(500).json({ error: 'Failed to retrieve messages over time' });
  }
}

export async function getDeliveryRates(req: Request, res: Response) {
  try {
    const counts = await prisma.messageRecipient.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const formatted = counts.map((item) => ({
      name: item.status,
      value: item._count.id,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('getDeliveryRates error:', err);
    res.status(500).json({ error: 'Failed to retrieve delivery status distribution' });
  }
}

export async function getCampaignPerformance(req: Request, res: Response) {
  try {
    // 1. Campaign comparison
    const campaigns = await prisma.campaign.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        template: true,
        recipients: {
          select: { status: true }
        }
      }
    });

    const campaignsStats = campaigns.map((c) => {
      const total = c.recipients.length;
      const delivered = c.recipients.filter(r => r.status === 'DELIVERED' || r.status === 'SENT').length;
      const failed = c.recipients.filter(r => r.status === 'FAILED' || r.status === 'UNDELIVERED').length;
      const rate = total > 0 ? Math.round((delivered / total) * 100) : 0;
      
      return {
        id: c.id,
        name: c.name,
        total,
        delivered,
        failed,
        rate,
      };
    });

    // 2. Top performing templates
    const templates = await prisma.messageTemplate.findMany({
      include: {
        campaigns: {
          include: {
            recipients: { select: { status: true } }
          }
        }
      }
    });

    const templatePerformance = templates.map((t) => {
      let totalSent = 0;
      let totalDelivered = 0;

      t.campaigns.forEach((camp) => {
        totalSent += camp.recipients.length;
        totalDelivered += camp.recipients.filter(r => r.status === 'DELIVERED' || r.status === 'SENT').length;
      });

      const rate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

      return {
        id: t.id,
        name: t.name,
        category: t.category,
        channel: t.channel,
        totalSent,
        deliveryRate: rate,
      };
    }).sort((a, b) => b.deliveryRate - a.deliveryRate);

    // 3. Opt-out trend (returns total opted out vs total active)
    const activeCount = await prisma.patient.count({ where: { optedOut: false } });
    const optedOutCount = await prisma.patient.count({ where: { optedOut: true } });

    res.json({
      campaigns: campaignsStats,
      templates: templatePerformance,
      optOutTrend: {
        active: activeCount,
        optedOut: optedOutCount,
        rate: activeCount + optedOutCount > 0 ? Math.round((optedOutCount / (activeCount + optedOutCount)) * 100) : 0
      }
    });
  } catch (err) {
    console.error('getCampaignPerformance error:', err);
    res.status(500).json({ error: 'Failed to retrieve campaign performance details' });
  }
}
