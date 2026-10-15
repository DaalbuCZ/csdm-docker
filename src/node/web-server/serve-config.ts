// Mutable runtime configuration for `csdm serve` (webhook URL, public URL, clip padding).
// Kept in a tiny module so the queues can read it without circular imports.
let discordWebhookUrl = '';
let publicUrl = '';
let clipPaddingSeconds = 6;
let clipMaxSeconds = 90;

export function setServeConfig(config: {
  discordWebhookUrl?: string;
  publicUrl?: string;
  clipPaddingSeconds?: number;
  clipMaxSeconds?: number;
}) {
  if (config.discordWebhookUrl !== undefined) {
    discordWebhookUrl = config.discordWebhookUrl.trim();
  }
  if (config.publicUrl !== undefined) {
    publicUrl = config.publicUrl.replace(/\/$/, '');
  }
  if (config.clipPaddingSeconds !== undefined) {
    clipPaddingSeconds = config.clipPaddingSeconds;
  }
  if (config.clipMaxSeconds !== undefined) {
    clipMaxSeconds = config.clipMaxSeconds;
  }
}

export function getDiscordWebhookUrl() {
  return discordWebhookUrl;
}

export function getPublicUrl() {
  return publicUrl;
}

export function getClipPaddingSeconds() {
  return clipPaddingSeconds;
}

export function getClipMaxSeconds() {
  return clipMaxSeconds;
}
