import { getDiscordWebhookUrl } from 'csdm/node/web-server/serve-config';

export type DiscordMatchSummary = {
  mapName: string;
  date: string;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  killCount: number;
  mvpName: string;
  mvpRating: number;
  highlightCount: number;
  matchUrl: string;
};

export function isDiscordEnabled() {
  return getDiscordWebhookUrl() !== '';
}

function escapeDiscordMarkdown(value: string) {
  return value.replaceAll(/([*_`~>|])/g, '\\$1');
}

export function buildDiscordMatchPayload(summary: DiscordMatchSummary) {
  const winner =
    summary.teamAScore === summary.teamBScore
      ? 'Draw'
      : summary.teamAScore > summary.teamBScore
        ? summary.teamAName
        : summary.teamBName;
  const description =
    `**${escapeDiscordMarkdown(summary.teamAName)} ${summary.teamAScore} : ${summary.teamBScore} ${escapeDiscordMarkdown(summary.teamBName)}**\n` +
    `${escapeDiscordMarkdown(summary.mapName)} · ${summary.killCount} kills · ${summary.highlightCount} highlights\n` +
    `MVP ${escapeDiscordMarkdown(summary.mvpName)} (${summary.mvpRating.toFixed(2)}) · Winner: ${escapeDiscordMarkdown(winner)}`;

  return {
    embeds: [
      {
        title: `Match analyzed — ${summary.mapName}`,
        url: summary.matchUrl || undefined,
        description,
        timestamp: summary.date || undefined,
        color: 0x3fd68c,
      },
    ],
  };
}

export async function sendDiscordMatchNotification(summary: DiscordMatchSummary) {
  const webhookUrl = getDiscordWebhookUrl();
  if (webhookUrl === '') {
    return;
  }
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildDiscordMatchPayload(summary)),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      logger.warn(`Discord webhook returned HTTP ${response.status}`);
    }
  } catch (error) {
    logger.warn('Failed to send Discord match notification');
    logger.warn(error);
  }
}
