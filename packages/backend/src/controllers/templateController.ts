import { Request, Response } from 'express';
import { prisma } from '../config/db';

export async function getTemplates(req: Request, res: Response) {
  try {
    const templates = await prisma.messageTemplate.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(templates);
  } catch (err) {
    console.error('getTemplates error:', err);
    res.status(500).json({ error: 'Failed to retrieve templates' });
  }
}

export async function createTemplate(req: Request, res: Response) {
  const { name, body, channel, category } = req.body;

  try {
    const template = await prisma.messageTemplate.create({
      data: { name, body, channel, category },
    });
    res.status(201).json(template);
  } catch (err) {
    console.error('createTemplate error:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
}

export async function updateTemplate(req: Request, res: Response) {
  const { id } = req.params;
  const { name, body, channel, category } = req.body;

  try {
    const template = await prisma.messageTemplate.update({
      where: { id },
      data: { name, body, channel, category },
    });
    res.json(template);
  } catch (err) {
    console.error('updateTemplate error:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
}

export async function deleteTemplate(req: Request, res: Response) {
  const { id } = req.params;

  try {
    // Check if template is used by any active automations
    const activeAutomation = await prisma.automationRule.findFirst({
      where: { templateId: id, isActive: true }
    });
    if (activeAutomation) {
      return res.status(400).json({ error: 'Cannot delete template as it is actively used in automation rules.' });
    }

    await prisma.messageTemplate.delete({ where: { id } });
    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    console.error('deleteTemplate error:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
}
