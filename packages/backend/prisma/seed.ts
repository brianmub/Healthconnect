import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean Database
  await prisma.patientTag.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.messageRecipient.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.automationRule.deleteMany({});
  await prisma.messageTemplate.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.patient.deleteMany({});

  // 2. Hash passwords
  const adminPasswordHash = await bcrypt.hash('Admin1234!', 10);
  const staffPasswordHash = await bcrypt.hash('Staff1234!', 10);

  // 3. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'Dr. Brian Mubvumbi',
      email: 'admin@healthconnect.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: 'Sarah Ncube',
      email: 'staff@healthconnect.com',
      passwordHash: staffPasswordHash,
      role: 'STAFF',
    },
  });

  console.log('✅ Users seeded.');

  // 4. Create Settings
  await prisma.setting.create({
    data: {
      id: 'global',
      clinicName: 'Macdent Dental Surgery',
      clinicPhone: '+263771234567',
      clinicAddress: '123 Samora Machel Ave, Harare',
      twilioAccountSid: 'ACmockaccountsiaddummyvalue',
      twilioAuthToken: 'mockauthtokendummyvalue',
      twilioPhoneNumber: '+1234567890',
      twilioWhatsappNumber: 'whatsapp:+14155238886',
      defaultCountryCode: 'ZW',
    },
  });

  console.log('✅ Clinic settings seeded.');

  // 5. Create Patients (50 patients)
  const patientTags = ['recall', 'orthodontics', 'VIP', 'pediatric', 'periodontic', 'hygiene'];
  const firstNames = [
    'Tinashe', 'Ruvimbo', 'Kudakwashe', 'Chipo', 'Farai', 'Tendai', 'Nyarai', 'Rufaro', 'Tapiwa', 'Tariro',
    'Tatenda', 'Tsitsi', 'Vimbai', 'Nyasha', 'Mazvita', 'Munyaradzi', 'Simbarashe', 'Tafadzwa', 'Takudzwa', 'Terrence',
    'Lovemore', 'Albert', 'Blessing', 'Clive', 'Donald', 'Emmanuel', 'Fiona', 'Grace', 'Hazel', 'Irene',
    'Joy', 'Kelly', 'Leah', 'Melissa', 'Naomi', 'Olga', 'Patricia', 'Rachel', 'Sandra', 'Theresa',
    'Ursula', 'Valerie', 'Wendy', 'Xavier', 'Yvonne', 'Zoe', 'Cynthia', 'Daisy', 'Evelyn', 'Faith'
  ];
  const lastNames = [
    'Moyo', 'Sibanda', 'Ndlovu', 'Maphosa', 'Dube', 'Ncube', 'Mpofu', 'Gumbo', 'Nkomo', 'Mundondo',
    'Mugabe', 'Tsvangirai', 'Mutasa', 'Chihuri', 'Makoni', 'Phiri', 'Moyo', 'Zhou', 'Shumba', 'Chauke',
    'Sithole', 'Marange', 'Chigumba', 'Muringani', 'Musarurwa', 'Muzorewa', 'Banda', 'Tembo', 'Kamanga', 'Kabila',
    'Masuku', 'Khumalo', 'Gazi', 'Ndiweni', 'Mahlangu', 'Thebe', 'Dlodlo', 'Khaya', 'Tshuma', 'Jiri',
    'Mutsago', 'Chatora', 'Mhandu', 'Zimuto', 'Hove', 'Bhasera', 'Mavhunga', 'Gaza', 'Shiri', 'Muchemwa'
  ];

  const patients = [];
  for (let i = 0; i < 50; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const phone = `+26377${1000000 + i}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const tagCount = (i % 3) + 1;
    
    const birthYear = 1970 + (i % 45);
    const birthMonth = i % 12;
    const birthDay = (i % 28) + 1;
    const dateOfBirth = new Date(birthYear, birthMonth, birthDay);

    const patient = await prisma.patient.create({
      data: {
        firstName,
        lastName,
        phone,
        whatsapp: i % 2 === 0 ? phone : null,
        email,
        dateOfBirth,
        optedOut: i === 49,
      },
    });

    const chosenTags: string[] = [];
    for (let t = 0; t < tagCount; t++) {
      const tag = patientTags[(i + t) % patientTags.length];
      if (!chosenTags.includes(tag)) {
        chosenTags.push(tag);
        await prisma.patientTag.create({
          data: {
            name: tag,
            patientId: patient.id,
          },
        });
      }
    }

    patients.push(patient);
  }

  console.log(`✅ ${patients.length} patients seeded with tags.`);

  // 6. Create Message Templates (6 templates)
  const templates = [
    {
      name: 'Appointment Reminder SMS',
      body: 'Hi {{firstName}}, this is a reminder of your appointment at {{clinicName}} on {{appointmentDate}} at {{appointmentTime}}. Please reply to confirm.',
      channel: 'SMS',
      category: 'REMINDER',
    },
    {
      name: 'Appointment Confirmation WhatsApp',
      body: 'Hello {{firstName}} {{lastName}}! 🦷 Your appointment at {{clinicName}} has been successfully booked for *{{appointmentDate}}* at *{{appointmentTime}}*. We look forward to seeing you!',
      channel: 'WHATSAPP',
      category: 'CONFIRMATION',
    },
    {
      name: 'Post-Appointment Follow-up WhatsApp',
      body: 'Hi {{firstName}}, we hope you had a comfortable visit today. Please let us know if you experience any discomfort. Have a great day! — {{clinicName}}',
      channel: 'WHATSAPP',
      category: 'FOLLOW_UP',
    },
    {
      name: 'Missed Appointment SMS',
      body: 'Dear {{firstName}}, we missed you today for your appointment. Please call us at {{clinicPhone}} to reschedule.',
      channel: 'SMS',
      category: 'MISSED_APPOINTMENT',
    },
    {
      name: 'Oral Health Recall Promo SMS',
      body: 'Hi {{firstName}}, it has been over 6 months since your last dental hygiene visit. Schedule a checkup this week at {{clinicName}} and get a free dental care kit!',
      channel: 'SMS',
      category: 'PROMOTION',
    },
    {
      name: 'General Holiday Wishes Both',
      body: 'Dear {{firstName}}, the team at {{clinicName}} wishes you and your family a healthy and happy holiday season!',
      channel: 'BOTH',
      category: 'GENERAL',
    },
  ];

  const seededTemplates = [];
  for (const t of templates) {
    const tmpl = await prisma.messageTemplate.create({
      data: t,
    });
    seededTemplates.push(tmpl);
  }

  console.log('✅ Message templates seeded.');

  // 7. Create Appointments (10 appointments)
  const appointmentTypes = ['checkup', 'filling', 'cleaning', 'ortho', 'root-canal', 'crown'];
  const startTimes = [
    new Date(nowDaysOffset(-5, 9)),
    new Date(nowDaysOffset(-4, 11)),
    new Date(nowDaysOffset(-2, 14)),
    new Date(nowDaysOffset(-1, 10)),
    new Date(nowDaysOffset(1, 9)),
    new Date(nowDaysOffset(1, 14)),
    new Date(nowDaysOffset(2, 10)),
    new Date(nowDaysOffset(3, 11)),
    new Date(nowDaysOffset(5, 15)),
    new Date(nowDaysOffset(6, 13)),
  ];

  const appointments = [];
  for (let i = 0; i < 10; i++) {
    const patient = patients[i % patients.length];
    const status = i < 2 
      ? 'COMPLETED' 
      : i === 2 
      ? 'NO_SHOW' 
      : i === 3 
      ? 'CANCELLED' 
      : i === 6 
      ? 'CONFIRMED' 
      : 'SCHEDULED';

    const appt = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        dateTime: startTimes[i],
        duration: 30 + (i % 3) * 15,
        type: appointmentTypes[i % appointmentTypes.length],
        status,
        notes: `Sample note for appointment number ${i + 1}`,
      },
    });
    appointments.push(appt);
  }

  console.log('✅ Appointments seeded.');

  // 8. Create Campaigns (3 campaigns)
  const promoTemplate = seededTemplates.find(t => t.category === 'PROMOTION')!;
  const campaignSent = await prisma.campaign.create({
    data: {
      name: 'June Dental Kit Promotion',
      templateId: promoTemplate.id,
      channel: 'SMS',
      status: 'SENT',
      scheduledAt: nowDaysOffset(-3, 8),
      sentAt: nowDaysOffset(-3, 8),
      createdById: admin.id,
    },
  });

  // Create recipients for Campaign 1 (10 recipients)
  for (let i = 0; i < 10; i++) {
    const patient = patients[i];
    const deliveryStatuses = [
      'DELIVERED',
      'DELIVERED',
      'DELIVERED',
      'SENT',
      'FAILED',
      'DELIVERED',
      'DELIVERED',
      'DELIVERED',
      'DELIVERED',
      'DELIVERED',
    ];
    const status = patient.optedOut ? 'OPT_OUT' : deliveryStatuses[i];

    await prisma.messageRecipient.create({
      data: {
        campaignId: campaignSent.id,
        patientId: patient.id,
        phone: patient.phone,
        status,
        sentAt: nowDaysOffset(-3, 8),
        deliveredAt: status === 'DELIVERED' ? nowDaysOffset(-3, 8, 5) : null,
        failReason: status === 'FAILED' ? 'Carrier routing error' : null,
        externalId: 'SM' + Math.random().toString(36).substring(2, 17).toUpperCase(),
        senderId: admin.id
      },
    });
  }

  // Campaign 2: Scheduled WhatsApp Campaign
  const reminderTemplate = seededTemplates.find(t => t.category === 'REMINDER')!;
  const campaignScheduled = await prisma.campaign.create({
    data: {
      name: 'Weekend Checkup Reminder Campaign',
      templateId: reminderTemplate.id,
      channel: 'SMS',
      status: 'SCHEDULED',
      scheduledAt: nowDaysOffset(2, 9),
      createdById: admin.id,
    },
  });

  for (let i = 10; i < 15; i++) {
    const patient = patients[i];
    await prisma.messageRecipient.create({
      data: {
        campaignId: campaignScheduled.id,
        patientId: patient.id,
        phone: patient.phone,
        status: 'PENDING',
      },
    });
  }

  // Campaign 3: Draft Campaign
  const followUpTemplate = seededTemplates.find(t => t.category === 'FOLLOW_UP')!;
  await prisma.campaign.create({
    data: {
      name: 'Weekly Follow-up Draft',
      templateId: followUpTemplate.id,
      channel: 'WHATSAPP',
      status: 'DRAFT',
      createdById: staff.id,
    },
  });

  console.log('✅ Campaigns seeded.');

  // 9. Create Automation Rules (3 rules)
  await prisma.automationRule.create({
    data: {
      name: '24 Hour Appointment Reminder',
      trigger: 'APPOINTMENT_REMINDER',
      offsetHours: -24,
      channel: 'SMS',
      templateId: seededTemplates.find(t => t.category === 'REMINDER')!.id,
      isActive: true,
    },
  });

  await prisma.automationRule.create({
    data: {
      name: 'Instant Booking Confirmation',
      trigger: 'APPOINTMENT_CONFIRMATION',
      offsetHours: 0,
      channel: 'WHATSAPP',
      templateId: seededTemplates.find(t => t.category === 'CONFIRMATION')!.id,
      isActive: true,
    },
  });

  await prisma.automationRule.create({
    data: {
      name: '2 Hour Post-Care Follow-up',
      trigger: 'POST_APPOINTMENT_FOLLOWUP',
      offsetHours: 2,
      channel: 'WHATSAPP',
      templateId: seededTemplates.find(t => t.category === 'FOLLOW_UP')!.id,
      isActive: true,
    },
  });

  console.log('✅ Automation rules seeded.');
  console.log('🎉 Database seeding complete!');
}

function nowDaysOffset(days: number, hour: number, minutesOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minutesOffset, 0, 0);
  return d;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
