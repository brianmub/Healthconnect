import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { validateAndNormalizePhone } from '../utils/phoneValidation';
import { Readable } from 'stream';
import csvParser from 'csv-parser';

export async function getPatients(req: Request, res: Response) {
  const { search, tag, optedOut, page = '1', limit = '10' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  try {
    const where: any = {};

    if (search) {
      const searchStr = search as string;
      where.OR = [
        { firstName: { contains: searchStr } },
        { lastName: { contains: searchStr } },
        { phone: { contains: searchStr } },
        { email: { contains: searchStr } },
      ];
    }

    if (tag) {
      where.tags = {
        some: {
          name: tag as string,
        },
      };
    }

    if (optedOut !== undefined) {
      where.optedOut = optedOut === 'true';
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: {
          tags: true,
        },
        orderBy: { lastName: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({
      patients,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('getPatients error:', err);
    res.status(500).json({ error: 'Failed to retrieve patients' });
  }
}

export async function getPatientById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        tags: true,
        medicalConditions: true,
        allergies: true,
        clinicalNotes: {
          include: { provider: true, appointment: true },
          orderBy: { createdAt: 'desc' }
        },
        invoices: {
          include: { payments: true },
          orderBy: { issueDate: 'desc' }
        },
        appointments: {
          include: { provider: true },
          orderBy: { dateTime: 'desc' },
        },
        messageRecipients: {
          include: {
            campaign: {
              include: {
                template: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (err) {
    console.error('getPatientById error:', err);
    res.status(500).json({ error: 'Failed to retrieve patient detail' });
  }
}

export async function createPatient(req: Request, res: Response) {
  const { firstName, lastName, phone, email, whatsapp, dateOfBirth, tags, gender, title, patientCategory, paymentMethod } = req.body;

  try {
    const settings = await prisma.setting.findUnique({ where: { id: 'global' } });
    const defaultCountry = (settings?.defaultCountryCode || 'ZW') as any;

    const normalizedPhone = validateAndNormalizePhone(phone, defaultCountry);
    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    const existing = await prisma.patient.findUnique({ where: { phone: normalizedPhone } });
    if (existing) {
      return res.status(400).json({ error: 'A patient with this phone number already exists' });
    }

    let normalizedWhatsapp: string | null = null;
    if (whatsapp) {
      const validated = validateAndNormalizePhone(whatsapp, defaultCountry);
      if (!validated) {
        return res.status(400).json({ error: 'Invalid WhatsApp phone number format' });
      }
      normalizedWhatsapp = validated;
    }

    let parsedDateOfBirth: Date | null = null;
    if (dateOfBirth) {
      const d = new Date(dateOfBirth);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ error: 'Invalid date of birth' });
      }
      parsedDateOfBirth = d;
    }

    const patient = await prisma.patient.create({
      data: {
        firstName,
        lastName,
        phone: normalizedPhone,
        whatsapp: normalizedWhatsapp,
        email: email || null,
        dateOfBirth: parsedDateOfBirth,
        gender: gender || null,
        title: title || null,
        patientCategory: patientCategory || null,
        paymentMethod: paymentMethod || null,
      },
    });

    // Create tags if provided
    if (tags && Array.isArray(tags)) {
      const uniqueTags = Array.from(new Set(tags.map((t: string) => t.trim().toLowerCase()))).filter(Boolean);
      await Promise.all(
        uniqueTags.map((tagName: string) =>
          prisma.patientTag.create({
            data: {
              name: tagName,
              patientId: patient.id,
            },
          })
        )
      );
    }

    const createdPatient = await prisma.patient.findUnique({
      where: { id: patient.id },
      include: { tags: true },
    });

    res.status(201).json(createdPatient);
  } catch (err) {
    console.error('createPatient error:', err);
    res.status(500).json({ error: 'Failed to create patient' });
  }
}

export async function updatePatient(req: Request, res: Response) {
  const { id } = req.params;
  const { firstName, lastName, phone, email, whatsapp, dateOfBirth, tags, optedOut, gender, title, patientCategory, paymentMethod } = req.body;

  try {
    const settings = await prisma.setting.findUnique({ where: { id: 'global' } });
    const defaultCountry = (settings?.defaultCountryCode || 'ZW') as any;

    let normalizedPhone: string | undefined;
    if (phone) {
      const validated = validateAndNormalizePhone(phone, defaultCountry);
      if (!validated) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }
      normalizedPhone = validated;
    }

    if (normalizedPhone) {
      const existing = await prisma.patient.findFirst({
        where: { phone: normalizedPhone, NOT: { id } },
      });
      if (existing) {
        return res.status(400).json({ error: 'A patient with this phone number already exists' });
      }
    }

    let normalizedWhatsapp: string | null | undefined = undefined;
    if (whatsapp !== undefined) {
      if (whatsapp === null || whatsapp === '') {
        normalizedWhatsapp = null;
      } else {
        const validated = validateAndNormalizePhone(whatsapp, defaultCountry);
        if (!validated) {
          return res.status(400).json({ error: 'Invalid WhatsApp phone number format' });
        }
        normalizedWhatsapp = validated;
      }
    }

    let parsedDateOfBirth: Date | null | undefined = undefined;
    if (dateOfBirth !== undefined) {
      if (dateOfBirth === null || dateOfBirth === '') {
        parsedDateOfBirth = null;
      } else {
        const d = new Date(dateOfBirth);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ error: 'Invalid date of birth' });
        }
        parsedDateOfBirth = d;
      }
    }

    // Update main model
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        firstName,
        lastName,
        phone: normalizedPhone,
        whatsapp: normalizedWhatsapp,
        email: email !== undefined ? (email || null) : undefined,
        dateOfBirth: parsedDateOfBirth,
        optedOut: optedOut !== undefined ? optedOut : undefined,
        gender: gender !== undefined ? (gender || null) : undefined,
        title: title !== undefined ? (title || null) : undefined,
        patientCategory: patientCategory !== undefined ? (patientCategory || null) : undefined,
        paymentMethod: paymentMethod !== undefined ? (paymentMethod || null) : undefined,
      },
    });

    // Sync tags if provided
    if (tags && Array.isArray(tags)) {
      const uniqueTags = Array.from(new Set(tags.map((t: string) => t.trim().toLowerCase()))).filter(Boolean);
      // delete old tags
      await prisma.patientTag.deleteMany({ where: { patientId: id } });
      // add new tags
      await Promise.all(
        uniqueTags.map((tagName: string) =>
          prisma.patientTag.create({
            data: {
              name: tagName,
              patientId: id,
            },
          })
        )
      );
    }

    const updatedPatient = await prisma.patient.findUnique({
      where: { id },
      include: { tags: true },
    });

    res.json(updatedPatient);
  } catch (err) {
    console.error('updatePatient error:', err);
    res.status(500).json({ error: 'Failed to update patient' });
  }
}

export async function deletePatient(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await prisma.patient.delete({ where: { id } });
    res.json({ message: 'Patient deleted successfully' });
  } catch (err) {
    console.error('deletePatient error:', err);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
}

export async function toggleOptOut(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: { optedOut: !patient.optedOut },
    });

    res.json({ message: `Patient opt-out status set to ${updated.optedOut}`, optedOut: updated.optedOut });
  } catch (err) {
    console.error('toggleOptOut error:', err);
    res.status(500).json({ error: 'Failed to toggle opt-out status' });
  }
}

export async function exportPatients(req: Request, res: Response) {
  try {
    const patients = await prisma.patient.findMany({
      include: { tags: true },
      orderBy: { lastName: 'asc' },
    });

    let csvContent = 'firstName,lastName,phone,email,whatsapp,gender,title,patientCategory,paymentMethod,optedOut,tags\n';
    for (const p of patients) {
      const tagStr = p.tags.map(t => t.name).join(';');
      csvContent += `"${p.firstName}","${p.lastName}","${p.phone}","${p.email || ''}","${p.whatsapp || ''}","${p.gender || ''}","${p.title || ''}","${p.patientCategory || ''}","${p.paymentMethod || ''}",${p.optedOut},"${tagStr}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=patients_export.csv');
    res.status(200).send(csvContent);
  } catch (err) {
    console.error('exportPatients error:', err);
    res.status(500).json({ error: 'Failed to export patients' });
  }
}

export async function importPatients(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file provided' });
  }

  const results: any[] = [];
  const bufferStream = new Readable();
  bufferStream.push(req.file.buffer);
  bufferStream.push(null);

  let successCount = 0;
  let invalidPhoneCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  bufferStream
    .pipe(csvParser())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      for (const row of results) {
        // Expected headers: firstName, lastName, phone, email, tags, gender, title, patientCategory, paymentMethod
        const firstName = row.firstName || row.FirstName || '';
        const lastName = row.lastName || row.LastName || '';
        const rawPhone = row.phone || row.Phone || '';
        const email = row.email || row.Email || null;
        const tagsRaw = row.tags || row.Tags || '';
        const gender = row.gender || row.Gender || null;
        const title = row.title || row.Title || null;
        const patientCategory = row.patientCategory || row.PatientCategory || null;
        const paymentMethod = row.paymentMethod || row.PaymentMethod || null;

        if (!firstName || !lastName || !rawPhone) {
          errorCount++;
          continue;
        }

        const normalizedPhone = validateAndNormalizePhone(rawPhone);
        if (!normalizedPhone) {
          invalidPhoneCount++;
          continue;
        }

        try {
          // Check for duplicate phone
          const existing = await prisma.patient.findUnique({ where: { phone: normalizedPhone } });
          if (existing) {
            duplicateCount++;
            continue;
          }

          // Create patient
          const patient = await prisma.patient.create({
            data: {
              firstName,
              lastName,
              phone: normalizedPhone,
              email: email || null,
              gender,
              title,
              patientCategory,
              paymentMethod,
            },
          });

          // Process tags (comma or semicolon separated)
          if (tagsRaw) {
            const tags = tagsRaw.split(/[,;]/).map((t: string) => t.trim().toLowerCase()).filter(Boolean);
            for (const t of tags) {
              await prisma.patientTag.create({
                data: {
                  name: t,
                  patientId: patient.id,
                },
              });
            }
          }
          successCount++;
        } catch (err) {
          console.error('Import row error:', err);
          errorCount++;
        }
      }

      res.json({
        summary: `${successCount} imported successfully, ${invalidPhoneCount} skipped (invalid phone), ${duplicateCount} skipped (duplicate), ${errorCount} errored`,
        successCount,
        invalidPhoneCount,
        duplicateCount,
        errorCount,
      });
    });
}

// Bulk tagging or campaign assignment
export async function bulkAction(req: Request, res: Response) {
  const { patientIds, action, data } = req.body;

  if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
    return res.status(400).json({ error: 'patientIds is required as a non-empty array' });
  }

  try {
    if (action === 'addTag') {
      const tagName = (data.tag || '').trim().toLowerCase();
      if (!tagName) {
        return res.status(400).json({ error: 'Tag name is required' });
      }

      let added = 0;
      for (const id of patientIds) {
        try {
          await prisma.patientTag.create({
            data: { name: tagName, patientId: id }
          });
          added++;
        } catch (e) {
          // ignore unique constraint duplicates
        }
      }
      return res.json({ message: `Tag "${tagName}" added to ${added} patients` });
    }

    if (action === 'removeTag') {
      const tagName = (data.tag || '').trim().toLowerCase();
      if (!tagName) {
        return res.status(400).json({ error: 'Tag name is required' });
      }

      const { count } = await prisma.patientTag.deleteMany({
        where: {
          name: tagName,
          patientId: { in: patientIds }
        }
      });
      return res.json({ message: `Tag "${tagName}" removed from ${count} patients` });
    }

    res.status(400).json({ error: 'Unknown bulk action' });
  } catch (err) {
    console.error('bulkAction error:', err);
    res.status(500).json({ error: 'Bulk action failed' });
  }
}
