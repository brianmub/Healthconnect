import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { messagingService } from '../services/messagingService';

export async function getCampaigns(req: AuthRequest, res: Response) {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        template: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { recipients: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute simple delivery rate stats
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (c) => {
        const counts = await prisma.messageRecipient.groupBy({
          by: ['status'],
          where: { campaignId: c.id },
          _count: { id: true },
        });

        let delivered = 0;
        let failed = 0;
        let total = 0;

        for (const count of counts) {
          total += count._count.id;
          if (count.status === 'DELIVERED' || count.status === 'SENT') {
            delivered += count._count.id;
          } else if (count.status === 'FAILED' || count.status === 'UNDELIVERED') {
            failed += count._count.id;
          }
        }

        const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

        return {
          ...c,
          recipientsCount: total,
          deliveredCount: delivered,
          failedCount: failed,
          deliveryRate,
        };
      })
    );

    res.json(campaignsWithStats);
  } catch (err) {
    console.error('getCampaigns error:', err);
    res.status(500).json({ error: 'Failed to retrieve campaigns' });
  }
}

export async function getCampaignById(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        template: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get delivery statistics
    const counts = await prisma.messageRecipient.groupBy({
      by: ['status'],
      where: { campaignId: id },
      _count: { id: true },
    });

    const stats = {
      pending: 0,
      queued: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      undelivered: 0,
      optOut: 0,
      total: 0,
    };

    for (const item of counts) {
      stats.total += item._count.id;
      if (item.status === 'PENDING') stats.pending = item._count.id;
      if (item.status === 'QUEUED') stats.queued = item._count.id;
      if (item.status === 'SENT') stats.sent = item._count.id;
      if (item.status === 'DELIVERED') stats.delivered = item._count.id;
      if (item.status === 'FAILED') stats.failed = item._count.id;
      if (item.status === 'UNDELIVERED') stats.undelivered = item._count.id;
      if (item.status === 'OPT_OUT') stats.optOut = item._count.id;
    }

    res.json({
      ...campaign,
      stats,
    });
  } catch (err) {
    console.error('getCampaignById error:', err);
    res.status(500).json({ error: 'Failed to retrieve campaign' });
  }
}

export async function createCampaign(req: AuthRequest, res: Response) {
  const { name, templateId, channel, recipientType, recipientIds, tags, scheduledAt } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Verify template exists
    const template = await prisma.messageTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      return res.status(400).json({ error: 'Template not found' });
    }

    // 2. Resolve recipients
    let patients: { id: string; phone: string }[] = [];

    if (recipientType === 'all') {
      patients = await prisma.patient.findMany({
        where: { optedOut: false },
        select: { id: true, phone: true },
      });
    } else if (recipientType === 'tag' && tags && Array.isArray(tags)) {
      patients = await prisma.patient.findMany({
        where: {
          optedOut: false,
          tags: {
            some: {
              name: { in: tags.map(t => t.trim().toLowerCase()) },
            },
          },
        },
        select: { id: true, phone: true },
      });
    } else if (recipientType === 'manual' && recipientIds && Array.isArray(recipientIds)) {
      patients = await prisma.patient.findMany({
        where: {
          id: { in: recipientIds },
          optedOut: false,
        },
        select: { id: true, phone: true },
      });
    }

    if (patients.length === 0) {
      return res.status(400).json({ error: 'No valid (non-opted-out) recipients found' });
    }

    // 3. Create Campaign
    const parsedScheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    const initialStatus = parsedScheduledAt ? 'SCHEDULED' : 'DRAFT';

    const campaign = await prisma.campaign.create({
      data: {
        name,
        templateId,
        channel,
        status: initialStatus,
        scheduledAt: parsedScheduledAt,
        createdById: userId,
      },
    });

    // 4. Create Message Recipients
    await prisma.messageRecipient.createMany({
      data: patients.map((p) => ({
        campaignId: campaign.id,
        patientId: p.id,
        phone: p.phone,
        status: 'PENDING',
      })),
    });

    // 5. Send immediately if not scheduled
    if (!parsedScheduledAt) {
      // Trigger bulk sending in background
      await messagingService.sendBulk(campaign.id);
    }

    res.status(201).json(campaign);
  } catch (err) {
    console.error('createCampaign error:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
}

export async function sendCampaign(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status === 'SENT' || campaign.status === 'SENDING') {
      return res.status(400).json({ error: 'Campaign has already been executed or is sending' });
    }

    // Trigger bulk sending asynchronously
    messagingService.sendBulk(id);

    res.json({ message: 'Campaign sending initiated' });
  } catch (err) {
    console.error('sendCampaign error:', err);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
}

export async function pauseCampaign(req: AuthRequest, res: Response) {
  const { id } = req.params;
  try {
    const campaign = await prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: 'Failed to pause campaign' });
  }
}

export async function cancelCampaign(req: AuthRequest, res: Response) {
  const { id } = req.params;
  try {
    const campaign = await prisma.campaign.update({
      where: { id },
      data: { status: 'FAILED' },
    });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel campaign' });
  }
}

export async function getCampaignRecipients(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { search, status, page = '1', limit = '10' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  try {
    const where: any = { campaignId: id };

    if (status) {
      where.status = status as any;
    }

    if (search) {
      where.patient = {
        OR: [
          { firstName: { contains: search as string } },
          { lastName: { contains: search as string } },
          { phone: { contains: search as string } },
        ],
      };
    }

    const [recipients, total] = await Promise.all([
      prisma.messageRecipient.findMany({
        where,
        include: {
          patient: true,
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.messageRecipient.count({ where }),
    ]);

    res.json({
      recipients,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('getCampaignRecipients error:', err);
    res.status(500).json({ error: 'Failed to retrieve campaign recipients' });
  }
}

export async function resendFailedRecipients(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    // 1. Find failed recipients
    const failedRecipients = await prisma.messageRecipient.findMany({
      where: {
        campaignId: id,
        status: { in: ['FAILED', 'UNDELIVERED'] },
      },
    });

    if (failedRecipients.length === 0) {
      return res.status(400).json({ error: 'No failed or undelivered recipients to resend to.' });
    }

    // 2. Reset status to PENDING
    await prisma.messageRecipient.updateMany({
      where: {
        campaignId: id,
        status: { in: ['FAILED', 'UNDELIVERED'] },
      },
      data: {
        status: 'PENDING',
        failReason: null,
        sentAt: null,
        deliveredAt: null,
        externalId: null,
      },
    });

    // 3. Initiate Bulk Send
    messagingService.sendBulk(id);

    res.json({ message: `Initiated resend for ${failedRecipients.length} failed messages.` });
  } catch (err) {
    console.error('resendFailedRecipients error:', err);
    res.status(500).json({ error: 'Failed to resend messages.' });
  }
}
