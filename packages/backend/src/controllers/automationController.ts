import { Request, Response } from 'express';
import { prisma } from '../config/db';

export async function getRules(req: Request, res: Response) {
  try {
    const rules = await prisma.automationRule.findMany({
      include: {
        template: {
          select: { id: true, name: true, body: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rules);
  } catch (err) {
    console.error('getRules error:', err);
    res.status(500).json({ error: 'Failed to retrieve automation rules' });
  }
}

export async function createRule(req: Request, res: Response) {
  const { name, trigger, offsetHours, channel, templateId, isActive } = req.body;

  try {
    const template = await prisma.messageTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      return res.status(400).json({ error: 'Selected message template does not exist' });
    }

    const rule = await prisma.automationRule.create({
      data: {
        name,
        trigger,
        offsetHours: parseInt(offsetHours, 10),
        channel,
        templateId,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: { template: true }
    });

    res.status(201).json(rule);
  } catch (err) {
    console.error('createRule error:', err);
    res.status(500).json({ error: 'Failed to create automation rule' });
  }
}

export async function updateRule(req: Request, res: Response) {
  const { id } = req.params;
  const { name, trigger, offsetHours, channel, templateId, isActive } = req.body;

  try {
    if (templateId) {
      const template = await prisma.messageTemplate.findUnique({ where: { id: templateId } });
      if (!template) {
        return res.status(400).json({ error: 'Selected message template does not exist' });
      }
    }

    const rule = await prisma.automationRule.update({
      where: { id },
      data: {
        name,
        trigger,
        offsetHours: offsetHours !== undefined ? parseInt(offsetHours, 10) : undefined,
        channel,
        templateId,
        isActive,
      },
      include: { template: true }
    });

    res.json(rule);
  } catch (err) {
    console.error('updateRule error:', err);
    res.status(500).json({ error: 'Failed to update automation rule' });
  }
}

export async function deleteRule(req: Request, res: Response) {
  const { id } = req.params;

  try {
    await prisma.automationRule.delete({ where: { id } });
    res.json({ message: 'Automation rule deleted successfully' });
  } catch (err) {
    console.error('deleteRule error:', err);
    res.status(500).json({ error: 'Failed to delete automation rule' });
  }
}

export async function toggleRule(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const rule = await prisma.automationRule.findUnique({ where: { id } });
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    const updated = await prisma.automationRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
      include: { template: true }
    });

    res.json(updated);
  } catch (err) {
    console.error('toggleRule error:', err);
    res.status(500).json({ error: 'Failed to toggle automation rule' });
  }
}
