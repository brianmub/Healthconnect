import { WhatsappProvider, SendResult } from '../types';

export class MetaWhatsappProvider implements WhatsappProvider {
  private phoneId: string;
  private token: string;

  constructor() {
    this.phoneId = process.env.META_WHATSAPP_PHONE_ID || '';
    this.token = process.env.META_WHATSAPP_TOKEN || '';
  }

  async sendWhatsApp(to: string, body: string): Promise<SendResult> {
    const mockSid = 'WA_META_' + Math.random().toString(36).substring(2, 17).toUpperCase();
    console.log(`[META WHATSAPP STUB] PhoneId: ${this.phoneId} To: ${to} Body: "${body}" | SID: ${mockSid}`);
    
    // In a real implementation, you would perform an HTTP POST request to:
    // https://graph.facebook.com/v19.0/${this.phoneId}/messages
    // with authorization headers (Bearer ${this.token}) and a JSON body specifying template or custom text.
    
    return {
      externalId: mockSid,
      status: 'queued'
    };
  }
}
