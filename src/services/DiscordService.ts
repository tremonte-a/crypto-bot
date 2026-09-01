import 'dotenv/config';

export class DiscordService {
  private webhookUrl: string | undefined;

  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  }

  /**
   * Send a message to Discord via webhook.
   * Returns true if successful, false otherwise.
   */
  async sendMessage(message: string): Promise<boolean> {
    if (!this.webhookUrl) {
      console.warn('[Discord] No webhook URL configured – message not sent.');
      return false;
    }
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      });
      if (!response.ok) {
        console.error(`[Discord] HTTP error: ${response.status}`);
        return false;
      }
      return true;
    } catch (error) {
      console.error('[Discord] Failed to send message:', error);
      return false;
    }
  }
}