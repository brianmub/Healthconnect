import { WhatsappProvider, SendResult } from '../types';

export class MetaWhatsappProvider implements WhatsappProvider {
  async sendWhatsApp(to: string, body: string): Promise<SendResult> {
    const phoneId = process.env.META_WHATSAPP_PHONE_ID;
    const token = process.env.META_WHATSAPP_TOKEN;

    if (!phoneId || !token || phoneId.startsWith('your_') || token.startsWith('your_') || phoneId.includes('xxxx')) {
      const mockSid = 'WA_META_MOCK_' + Math.random().toString(36).substring(2, 17).toUpperCase();
      console.log(`[MOCK META WHATSAPP] To: ${to} Body: "${body}" | SID: ${mockSid}`);
      return {
        externalId: mockSid,
        status: 'queued'
      };
    }

    // Clean phone number (Meta requires digits only, e.g., 263771234567)
    const cleanPhone = to.replace(/\D/g, '');

    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: { body },
          }),
        }
      );

      const data = await response.json() as any;

      if (!response.ok) {
        throw new Error(data?.error?.message || `Meta API returned HTTP ${response.status}`);
      }

      const messageId = data?.messages?.[0]?.id;
      return {
        externalId: messageId || 'META_WA_SUCCESS',
        status: 'queued'
      };
    } catch (err: any) {
      console.error('Meta WhatsApp send error:', err);
      return {
        externalId: '',
        status: 'failed',
        error: err.message || 'Error occurred while calling Meta Cloud API'
      };
    }
  }
}

