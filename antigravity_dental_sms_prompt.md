# 🦷 DentaConnect — Bulk SMS & WhatsApp Messaging Platform
## Antigravity Build Prompt (Full-Stack Web Application)

---

## PROJECT OVERVIEW

Build a full-stack responsive web application called **DentaConnect** for a dental practice.
The app enables staff to send bulk SMS and WhatsApp messages to patients, automate appointment
reminders, manage patient contact lists, and track message delivery — all from a single dashboard.

The application must be **fully responsive** (desktop + tablet + mobile) and installable as a
**Progressive Web App (PWA)** so clinic staff can use it on their phones without needing the
Play Store or App Store.

---

## TECH STACK

### Frontend
- **React 18** with **TypeScript**
- **Vite** as the build tool
- **Tailwind CSS** for styling (with `tailwind.config.ts`)
- **React Router v6** for client-side routing
- **React Query (TanStack Query v5)** for server state management
- **React Hook Form + Zod** for form validation
- **Recharts** for analytics/charts
- **date-fns** for date formatting
- **Lucide React** for icons
- **Sonner** for toast notifications

### Backend
- **Node.js** with **Express** and **TypeScript**
- **Prisma ORM** with **PostgreSQL** (use SQLite for local dev)
- **JWT authentication** (access + refresh tokens)
- **BullMQ + Redis** for background job queues (scheduled messages)
- **node-cron** for recurring reminder schedules
- **Multer** for CSV file uploads
- **csv-parser** for parsing patient import files

### SMS Gateway Integration
- **Twilio** for SMS (use environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`)
- Abstract the SMS provider behind a `SmsProvider` interface so it can be swapped for Africa's Talking, Vonage, or any other gateway by changing one config file. Include a `providers/africasTalking.ts` stub as an alternative for African markets.

### WhatsApp Integration
- **Twilio WhatsApp Sandbox** (same credentials, different `from` number prefix `whatsapp:`)
- Abstract behind a `WhatsappProvider` interface
- Include a stub for **Meta Cloud API (WhatsApp Business API)** as an alternative provider

### PWA
- **Vite PWA plugin** (`vite-plugin-pwa`) with a service worker
- Manifest with dental practice branding (name, icons, theme color `#0ea5e9`)
- Offline fallback page

### Infrastructure / Config
- **Docker Compose** file with services: `app`, `postgres`, `redis`
- `.env.example` file listing all required environment variables
- **dotenv** for environment config

---

## DATABASE SCHEMA (Prisma)

Create the following models in `prisma/schema.prisma`:

```prisma
model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  passwordHash  String
  role          Role     @default(STAFF)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  messages      Message[]
  campaigns     Campaign[]
}

enum Role {
  ADMIN
  STAFF
}

model Patient {
  id          String   @id @default(cuid())
  firstName   String
  lastName    String
  phone       String   @unique
  whatsapp    String?
  email       String?
  dateOfBirth DateTime?
  tags        String[]  // e.g. ["recall", "orthodontics", "VIP"]
  optedOut    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  appointments Appointment[]
  messageRecipients MessageRecipient[]
}

model Appointment {
  id          String            @id @default(cuid())
  patientId   String
  patient     Patient           @relation(fields: [patientId], references: [id])
  dateTime    DateTime
  duration    Int               // minutes
  type        String            // "checkup", "filling", "cleaning", etc.
  status      AppointmentStatus @default(SCHEDULED)
  notes       String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  COMPLETED
  CANCELLED
  NO_SHOW
}

model MessageTemplate {
  id        String      @id @default(cuid())
  name      String
  body      String      // supports variables: {{firstName}}, {{appointmentDate}}, {{clinicName}}
  channel   Channel
  category  TemplateCategory
  createdAt DateTime    @default(now())
  campaigns Campaign[]
}

enum Channel {
  SMS
  WHATSAPP
  BOTH
}

enum TemplateCategory {
  REMINDER
  CONFIRMATION
  FOLLOW_UP
  PROMOTION
  GENERAL
  MISSED_APPOINTMENT
}

model Campaign {
  id          String         @id @default(cuid())
  name        String
  templateId  String
  template    MessageTemplate @relation(fields: [templateId], references: [id])
  channel     Channel
  status      CampaignStatus @default(DRAFT)
  scheduledAt DateTime?
  sentAt      DateTime?
  createdById String
  createdBy   User           @relation(fields: [createdById], references: [id])
  recipients  MessageRecipient[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  SENDING
  SENT
  FAILED
  PAUSED
}

model MessageRecipient {
  id          String          @id @default(cuid())
  campaignId  String
  campaign    Campaign        @relation(fields: [campaignId], references: [id])
  patientId   String
  patient     Patient         @relation(fields: [patientId], references: [id])
  phone       String
  status      DeliveryStatus  @default(PENDING)
  sentAt      DateTime?
  deliveredAt DateTime?
  failReason  String?
  externalId  String?         // Twilio message SID
  createdAt   DateTime        @default(now())
}

enum DeliveryStatus {
  PENDING
  QUEUED
  SENT
  DELIVERED
  FAILED
  UNDELIVERED
  OPT_OUT
}

model AutomationRule {
  id          String   @id @default(cuid())
  name        String
  trigger     AutomationTrigger
  offsetHours Int      // e.g. -24 means 24 hours before appointment
  channel     Channel
  templateId  String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
}

enum AutomationTrigger {
  APPOINTMENT_REMINDER     // X hours before appointment
  APPOINTMENT_CONFIRMATION // on booking
  POST_APPOINTMENT_FOLLOWUP // X hours after appointment
  MISSED_APPOINTMENT       // triggered when status = NO_SHOW
  RECALL_REMINDER          // 6-month recall
}
```

---

## APPLICATION PAGES & ROUTES

### Public Routes
- `/login` — Login page (email + password)

### Protected Routes (require JWT)

#### 1. `/dashboard`
Main dashboard with:
- KPI cards: Total Patients, Messages Sent Today, Delivery Rate (%), Upcoming Appointments (next 7 days)
- Line chart: Messages sent per day (last 30 days) — SMS vs WhatsApp lines
- Donut chart: Delivery status breakdown (Delivered / Failed / Pending)
- Recent Campaigns table (last 5, with status badges)
- Upcoming appointments list (next 10, with "Send Reminder" quick action button)

#### 2. `/patients`
Patient management:
- Paginated, searchable, filterable table (filter by tags, opt-out status)
- Add patient modal (form with validation)
- Edit patient drawer
- Import patients via CSV upload (map columns: firstName, lastName, phone, email, tags)
- Export patients to CSV
- Bulk select → add to campaign OR update tags
- Individual patient profile page at `/patients/:id` showing message history, appointments

#### 3. `/campaigns`
Campaign management:
- List all campaigns with status, channel icon (SMS/WhatsApp), recipient count, delivery rate
- Create Campaign wizard (3 steps):
  - Step 1: Name, channel (SMS / WhatsApp / Both), select template
  - Step 2: Select recipients (all patients / by tag / manual select / import list)
  - Step 3: Schedule (send now / schedule for later with date-time picker) + preview message with variable substitution
- Campaign detail page at `/campaigns/:id`:
  - Stats: sent, delivered, failed, pending
  - Recipient table with individual delivery statuses
  - Re-send to failed button

#### 4. `/templates`
Message template management:
- Grid of template cards showing name, category badge, channel, preview snippet
- Create/Edit template modal with:
  - Template name
  - Category selector
  - Channel selector
  - Message body textarea with variable insertion buttons: `{{firstName}}`, `{{lastName}}`, `{{appointmentDate}}`, `{{appointmentTime}}`, `{{clinicName}}`, `{{clinicPhone}}`
  - Live character count (SMS: 160 chars per segment)
  - Live preview panel showing rendered message with sample values

#### 5. `/appointments`
Appointment management:
- Calendar view (month/week/day using a custom calendar component) + list view toggle
- Add/edit appointment modal
- Status update dropdown per appointment
- Quick "Send Reminder" button on each appointment card
- Appointment type color coding

#### 6. `/automation`
Automated messaging rules:
- List of automation rules (card layout) showing trigger, timing, template, channel, active toggle
- Create/Edit automation rule form:
  - Trigger type selector
  - Offset hours (e.g. "24 hours before appointment")
  - Channel + template selector
  - Enable/disable toggle
- Preview: "This rule will send: [template preview] via [channel] [X hours] [before/after] [trigger event]"

#### 7. `/analytics`
Analytics page:
- Date range picker
- Charts: messages over time, delivery rates, channel breakdown, campaign performance comparison
- Top performing templates table
- Opt-out rate trend

#### 8. `/settings`
Settings page with tabs:
- **Clinic Profile**: clinic name, phone, address, logo upload
- **SMS Settings**: Twilio Account SID, Auth Token, From Number (masked), test send button
- **WhatsApp Settings**: WhatsApp Business number, Meta API token (or Twilio WhatsApp), test send
- **Users**: list users, invite new user, change roles (admin only)
- **Opt-Out**: manage global opt-out list, import/export

---

## API ROUTES (Express)

### Auth
- `POST /api/auth/login` — returns `{ accessToken, refreshToken, user }`
- `POST /api/auth/refresh` — returns new `accessToken`
- `POST /api/auth/logout`

### Patients
- `GET /api/patients` — paginated list, supports `?search=&tag=&page=&limit=`
- `POST /api/patients` — create
- `GET /api/patients/:id` — detail with message history
- `PUT /api/patients/:id` — update
- `DELETE /api/patients/:id` — soft delete
- `POST /api/patients/import` — CSV upload (multipart/form-data)
- `GET /api/patients/export` — download CSV
- `POST /api/patients/:id/opt-out` — toggle opt-out

### Campaigns
- `GET /api/campaigns`
- `POST /api/campaigns` — create campaign (body: name, templateId, channel, recipientType, recipientIds/tags, scheduledAt)
- `GET /api/campaigns/:id`
- `POST /api/campaigns/:id/send` — trigger send immediately
- `POST /api/campaigns/:id/pause`
- `POST /api/campaigns/:id/cancel`
- `GET /api/campaigns/:id/recipients` — paginated recipients with delivery status

### Templates
- `GET /api/templates`
- `POST /api/templates`
- `PUT /api/templates/:id`
- `DELETE /api/templates/:id`

### Appointments
- `GET /api/appointments` — supports `?from=&to=&patientId=&status=`
- `POST /api/appointments`
- `PUT /api/appointments/:id`
- `DELETE /api/appointments/:id`
- `POST /api/appointments/:id/send-reminder` — immediate reminder send

### Automation
- `GET /api/automation/rules`
- `POST /api/automation/rules`
- `PUT /api/automation/rules/:id`
- `DELETE /api/automation/rules/:id`
- `PATCH /api/automation/rules/:id/toggle`

### Analytics
- `GET /api/analytics/overview` — KPI totals
- `GET /api/analytics/messages-over-time` — `?from=&to=&groupBy=day|week`
- `GET /api/analytics/delivery-rates`
- `GET /api/analytics/campaign-performance`

### Settings
- `GET /api/settings`
- `PUT /api/settings`
- `POST /api/settings/sms/test` — send test SMS
- `POST /api/settings/whatsapp/test` — send test WhatsApp

### Webhooks
- `POST /api/webhooks/twilio/sms` — Twilio delivery status webhook (update `MessageRecipient.status`)
- `POST /api/webhooks/twilio/whatsapp` — WhatsApp delivery status webhook

---

## MESSAGE SENDING SERVICE

Create `src/services/messagingService.ts` with:

```typescript
interface SendResult {
  externalId: string;
  status: 'queued' | 'failed';
  error?: string;
}

class MessagingService {
  async sendSms(to: string, body: string): Promise<SendResult>
  async sendWhatsApp(to: string, body: string): Promise<SendResult>
  async sendBulk(campaignId: string): Promise<void>  // processes via BullMQ queue
  interpolateTemplate(template: string, variables: Record<string, string>): string
}
```

The `sendBulk` method must:
1. Fetch all `MessageRecipient` rows for the campaign with status `PENDING`
2. Add each to a BullMQ queue named `message-queue`
3. Process in batches of 10 with 500ms delay between batches (rate limiting)
4. Update `MessageRecipient.status` after each send attempt
5. Mark campaign as `SENT` when all recipients are processed

---

## AUTOMATION WORKER

Create `src/workers/automationWorker.ts`:
- Runs every 5 minutes via `node-cron`
- Queries upcoming appointments where `dateTime` falls within the next 24–48 hours
- Checks active `AutomationRule` rows and determines which messages are due
- Prevents duplicate sends by checking if a `MessageRecipient` already exists for that patient + campaign type + appointment
- Creates campaign + sends message for each matching rule

---

## FRONTEND COMPONENT STRUCTURE

```
src/
├── components/
│   ├── ui/               # Button, Input, Modal, Badge, Card, Select, Textarea, Avatar, Spinner
│   ├── layout/           # AppShell, Sidebar, TopBar, MobilNav
│   ├── dashboard/        # KpiCard, MessageChart, DeliveryDonut, RecentCampaigns
│   ├── patients/         # PatientTable, PatientForm, ImportModal, PatientProfile
│   ├── campaigns/        # CampaignList, CampaignWizard, CampaignDetail, RecipientTable
│   ├── templates/        # TemplateGrid, TemplateForm, TemplatePreview
│   ├── appointments/     # AppointmentCalendar, AppointmentList, AppointmentForm
│   ├── automation/       # RuleCard, RuleForm
│   └── analytics/        # AnalyticsCharts, DateRangePicker
├── pages/                # One file per route
├── hooks/                # useAuth, usePatients, useCampaigns, useDebounce, usePagination
├── services/             # api.ts (axios instance with interceptors)
├── store/                # authStore.ts (Zustand)
├── types/                # All TypeScript interfaces mirroring Prisma models
└── utils/                # formatDate, interpolateTemplate, phoneValidation
```

---

## UI DESIGN SYSTEM

### Color Palette (Tailwind config)
- **Primary**: `sky-500` (#0ea5e9) — buttons, active nav, links
- **Success**: `emerald-500` — delivered status
- **Warning**: `amber-500` — scheduled, pending
- **Danger**: `red-500` — failed status
- **Neutral**: `slate-*` family for text, borders, backgrounds

### Layout
- Sidebar navigation (collapsible on mobile to bottom tab bar)
- Top bar with clinic name, user avatar, notification bell
- Content area with consistent `px-4 sm:px-6 lg:px-8` padding
- Mobile: sidebar collapses to a slide-out drawer + bottom navigation tabs

### Responsive Breakpoints
- Mobile (< 640px): single column, bottom nav, stacked cards
- Tablet (640–1024px): two column where applicable, sidebar as overlay
- Desktop (> 1024px): full sidebar, multi-column layouts

### Status Badges
Consistent badge component:
```
DELIVERED  → emerald background
PENDING    → amber background
FAILED     → red background
SCHEDULED  → blue background
SENT       → sky background
DRAFT      → slate background
```

---

## SEED DATA

Create `prisma/seed.ts` that seeds:
- 1 admin user: `admin@dentaconnect.com` / `Admin1234!`
- 1 staff user: `staff@dentaconnect.com` / `Staff1234!`
- 50 sample patients with Zimbabwean phone numbers (+263 format)
- 10 sample appointments (mix of past and future)
- 6 message templates (one per TemplateCategory)
- 3 sample campaigns (1 sent, 1 scheduled, 1 draft)
- 3 automation rules (appointment reminder 24h before, confirmation on booking, follow-up 2h after)
- Clinic settings: `{ clinicName: "SmileCare Dental Practice", clinicPhone: "+263771234567", clinicAddress: "123 Samora Machel Ave, Harare" }`

---

## ENVIRONMENT VARIABLES (.env.example)

```
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dentaconnect"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Twilio SMS
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_PHONE_NUMBER="+1234567890"

# Twilio WhatsApp
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# Meta WhatsApp Business API (alternative)
META_WHATSAPP_PHONE_ID=""
META_WHATSAPP_TOKEN=""

# Africa's Talking (alternative SMS for Africa)
AT_API_KEY=""
AT_USERNAME=""
AT_SENDER_ID=""

# Redis (for BullMQ)
REDIS_URL="redis://localhost:6379"

# App
PORT=3001
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
```

---

## DOCKER COMPOSE

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: dentaconnect
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: dentaconnect
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://dentaconnect:secret@postgres:5432/dentaconnect
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  pgdata:
```

---

## README.md

Include a README with:
1. Project overview
2. Prerequisites (Node 20+, Docker)
3. Quick start (clone → `cp .env.example .env` → `docker compose up -d` → `npm install` → `npx prisma migrate dev` → `npm run seed` → `npm run dev`)
4. Architecture diagram (text-based)
5. SMS gateway setup instructions (Twilio + Africa's Talking)
6. WhatsApp setup instructions (Twilio Sandbox + Meta Business API)
7. PWA install instructions
8. Webhook configuration for Twilio delivery receipts
9. Deployment guide (Railway / Render / VPS)

---

## ADDITIONAL REQUIREMENTS

1. **Opt-out compliance**: Any message body must automatically append "Reply STOP to unsubscribe". Check `patient.optedOut` before sending and skip opted-out patients silently (mark as `OPT_OUT` status).

2. **Phone number validation**: Validate and normalise all phone numbers to E.164 format using the `libphonenumber-js` library. The default country code should be configurable (default: `ZW` for Zimbabwe).

3. **Rate limiting**: Apply `express-rate-limit` to all API routes (100 req/15min general, 10 req/15min for auth endpoints).

4. **Input sanitisation**: Use `helmet` and `express-validator` on all POST/PUT routes.

5. **Audit logging**: Log all outbound messages to the database with timestamp, sender user, channel, and recipient count.

6. **CSV Import validation**: Validate phone numbers on import. Show a summary modal: "48 imported successfully, 3 skipped (invalid phone), 1 skipped (duplicate)".

7. **Message preview**: Always show the interpolated message preview before sending a campaign, replacing template variables with the first recipient's data as an example.

8. **Delivery receipt webhooks**: Handle Twilio status callbacks (`/api/webhooks/twilio/sms` and `/api/webhooks/twilio/whatsapp`). Validate the webhook signature using `twilio.validateRequest()`. Update `MessageRecipient.status` and `deliveredAt` in real time.

9. **PWA offline page**: When offline, show a branded offline page with the clinic name and "You are currently offline. Please check your connection."

10. **Error boundaries**: Wrap each page in a React error boundary. Show a friendly "Something went wrong" card with a retry button instead of a blank screen.

---

## BUILD ORDER FOR AGENTS

Execute in this order to avoid dependency issues:

1. Scaffold monorepo: `packages/backend` and `packages/frontend`
2. Set up Prisma schema + migrations + seed
3. Build Express server with auth middleware
4. Build all API routes (stub responses first, then real logic)
5. Set up BullMQ + messaging service + Twilio integration
6. Set up automation worker (cron)
7. Set up Vite + React + Tailwind frontend
8. Build UI components (design system first)
9. Build pages in route order: Login → Dashboard → Patients → Templates → Campaigns → Appointments → Automation → Analytics → Settings
10. Wire up React Query hooks to API
11. Add PWA config
12. Add Docker Compose + README
13. Run seed and verify end-to-end flow
