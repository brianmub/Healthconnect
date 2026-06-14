export interface SendResult {
  externalId: string;
  status: 'queued' | 'failed';
  error?: string;
}

export interface SmsProvider {
  sendSms(to: string, body: string): Promise<SendResult>;
}

export interface WhatsappProvider {
  sendWhatsApp(to: string, body: string): Promise<SendResult>;
}
