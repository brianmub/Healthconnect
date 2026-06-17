import { Router } from 'express';
import { prisma } from '../config/db';
import { authenticateJWT as validateToken } from '../middleware/auth';

const router = Router();
router.use(validateToken);

// --- Medical Conditions ---
router.post('/conditions', async (req, res) => {
  try {
    const { patientId, condition, diagnosedAt, notes } = req.body;
    const medCondition = await prisma.medicalCondition.create({
      data: { patientId, condition, diagnosedAt: diagnosedAt ? new Date(diagnosedAt) : null, notes },
    });
    res.status(201).json(medCondition);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add condition', details: error.message });
  }
});

router.delete('/conditions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.medicalCondition.delete({ where: { id } });
    res.json({ message: 'Condition deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete condition', details: error.message });
  }
});

// --- Allergies ---
router.post('/allergies', async (req, res) => {
  try {
    const { patientId, allergen, severity } = req.body;
    const allergy = await prisma.allergy.create({
      data: { patientId, allergen, severity },
    });
    res.status(201).json(allergy);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add allergy', details: error.message });
  }
});

router.delete('/allergies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.allergy.delete({ where: { id } });
    res.json({ message: 'Allergy deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete allergy', details: error.message });
  }
});

// --- Clinical Notes ---
router.post('/notes', async (req, res) => {
  try {
    const { patientId, appointmentId, providerId, content, attachments } = req.body;
    const note = await prisma.clinicalNote.create({
      data: { patientId, appointmentId, providerId, content, attachments },
      include: { provider: true, appointment: true }
    });
    res.status(201).json(note);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create clinical note', details: error.message });
  }
});

router.delete('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.clinicalNote.delete({ where: { id } });
    res.json({ message: 'Clinical note deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete clinical note', details: error.message });
  }
});

export default router;
