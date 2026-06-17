import { Router } from 'express';
import { prisma } from '../config/db';
import { validateToken } from '../middleware/auth';

const router = Router();
router.use(validateToken);

// Get all providers
router.get('/', async (req, res) => {
  try {
    const providers = await prisma.provider.findMany({
      orderBy: { lastName: 'asc' },
    });
    res.json(providers);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch providers', details: error.message });
  }
});

// Create provider
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, specialization, email, phone, color } = req.body;
    const provider = await prisma.provider.create({
      data: { firstName, lastName, specialization, email, phone, color },
    });
    res.status(201).json(provider);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create provider', details: error.message });
  }
});

// Update provider
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, specialization, email, phone, color } = req.body;
    const provider = await prisma.provider.update({
      where: { id },
      data: { firstName, lastName, specialization, email, phone, color },
    });
    res.json(provider);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update provider', details: error.message });
  }
});

// Delete provider
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.provider.delete({ where: { id } });
    res.json({ message: 'Provider deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete provider', details: error.message });
  }
});

export default router;
