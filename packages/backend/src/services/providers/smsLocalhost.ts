import { SmsProvider, SendResult } from '../types';

const SMS_LOCALHOST_BASE_URL = 'https://sms.localhost.co.zw';

export class SmsLocalhostProvider implements SmsProvider {
  private apiKey: string;
  private senderId: string;
  private isMock = false;

  constructor() {
    this.apiKey   = process.env.SMS_LOCALHOST_API_KEY   || '';
    this.senderId = process.env.SMS_LOCALHOST_SENDER_ID || '';

    if (!this.apiKey || this.apiKey.startsWith('mock') || this.apiKey.includes('xxxx')) {
      console.log('⚠️ SMS Localhost credentials missing or mock. Running in Mock Mode.');
      this.isMock = true;
    } else {
      console.log('✅ SMS Localhost provider initialized.');
    }
  }

  async sendSms(to: string, body: string): Promise<SendResult> {
    if (this.isMock) {
      const mockId = 'SL-' + Math.random().toString(36).substring(2, 12).toUpperCase();
      console.log(`[MOCK SMS Localhost] Sender: ${this.senderId} | To: ${to} | Body: "${body}" | MsgId: ${mockId}`);
      return { externalId: mockId, status: 'queued' };
    }

    try {
      const response = await fetch(`${SMS_LOCALHOST_BASE_URL}/api/v1/sms/send/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({
          to,
          sender: this.senderId,
          message: body,
        }),
      });

      // Handle HTTP-level errors from the API
      if (!response.ok) {
        let errorMsg = `SMS Localhost HTTP ${response.status}`;
        try {
          const errBody: any = await response.json();
          if (errBody?.error) errorMsg = errBody.error;
        } catch {
          // ignore JSON parse errors on error bodies
        }

        // Map specific status codes to useful messages
        if (response.status === 401) errorMsg = 'Invalid or missing SMS Localhost API key';
        if (response.status === 402) errorMsg = 'Insufficient SMS credits';
        if (response.status === 403) errorMsg = 'Sender ID not approved or insufficient permissions';
        if (response.status === 429) errorMsg = 'SMS Localhost rate limit exceeded';

        return { externalId: '', status: 'failed', error: errorMsg };
      }

      const data: any = await response.json();

      // Successful response shape: { message_id, channel, status, to, sender, sms_credits }
      const messageId: string = data?.message_id ?? '';
      const apiStatus: string = (data?.status ?? '').toLowerCase();

      // API returns "sent" on success
      if (apiStatus === 'sent' || apiStatus === 'queued') {
        console.log(`[SMS Localhost] Sent to ${to} | MsgId: ${messageId} | Credits left: ${data?.sms_credits ?? 'N/A'}`);
        return { externalId: messageId, status: 'queued' };
      }

      return {
        externalId: messageId,
        status: 'failed',
        error: `SMS Localhost returned unexpected status: ${apiStatus}`,
      };
    } catch (err: any) {
      console.error('SMS Localhost network/fetch error:', err);
      return {
        externalId: '',
        status: 'failed',
        error: err?.message ?? 'Unknown SMS Localhost error',
      };
    }
  }
}
