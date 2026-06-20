import { SmsProvider, SendResult } from '../types';

// Africa's Talking does not ship type definitions, so we use require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AfricasTalking = require('africastalking');

export class AfricasTalkingProvider implements SmsProvider {
  private smsClient: any = null;
  private senderId?: string;
  private isMock = false;
  private isSandbox = false;

  constructor() {
    const apiKey   = process.env.AT_API_KEY   || '';
    const username = process.env.AT_USERNAME  || '';
    this.senderId  = process.env.AT_SENDER_ID || undefined;

    // Detect sandbox mode: Africa's Talking uses username "sandbox" for testing
    this.isSandbox = username === 'sandbox';

    if (!apiKey || !username || apiKey.startsWith('mock') || apiKey.includes('xxxx') || apiKey.startsWith('your_')) {
      console.log("⚠️ Africa's Talking credentials missing or mock. AT provider running in Mock Mode.");
      this.isMock = true;
    } else {
      try {
        const at = AfricasTalking({ apiKey, username });
        this.smsClient = at.SMS;
        if (this.isSandbox) {
          console.log("✅ Africa's Talking initialized in SANDBOX mode.");
        } else {
          console.log("✅ Africa's Talking initialized in LIVE mode.");
        }
      } catch (err) {
        console.error("⚠️ Failed to initialize Africa's Talking SDK. Falling back to Mock Mode.", err);
        this.isMock = true;
      }
    }
  }

  async sendSms(to: string, body: string): Promise<SendResult> {
    if (this.isMock) {
      const mockId = 'AT' + Math.random().toString(36).substring(2, 12).toUpperCase();
      console.log(`[MOCK AT SMS] SenderId: ${this.senderId ?? 'None'} | To: ${to} | Body: "${body}" | MsgId: ${mockId}`);
      return { externalId: mockId, status: 'queued' };
    }

    try {
      const options: any = {
        to: [to],
        message: body,
      };
      if (this.senderId) {
        options.from = this.senderId;
      }

      const result = await this.smsClient.send(options);
      const recipients: any[] = result?.SMSMessageData?.Recipients ?? [];

      if (recipients.length === 0) {
        return {
          externalId: '',
          status: 'failed',
          error: 'No recipients returned by Africa\'s Talking API',
        };
      }

      const recipient = recipients[0];
      const atStatus: string = (recipient.status ?? '').toLowerCase();

      // AT statuses: "Success", "InvalidPhoneNumber", "UserInBlacklist", etc.
      const isFailed = atStatus !== 'success' && !atStatus.includes('sent');

      return {
        externalId: recipient.messageId ?? '',
        status: isFailed ? 'failed' : 'queued',
        error: isFailed ? `AT error: ${recipient.status}` : undefined,
      };
    } catch (err: any) {
      console.error("Africa's Talking SMS error:", err);
      return {
        externalId: '',
        status: 'failed',
        error: err?.message ?? "Unknown Africa's Talking error",
      };
    }
  }
}
