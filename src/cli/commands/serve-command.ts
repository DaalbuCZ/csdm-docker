import path from 'node:path';
import { Command } from './command';
import { startWebServer } from 'csdm/node/web-server/start-web-server';
import { createDatabaseConnection } from 'csdm/node/database/database';
import { migrateDatabase } from 'csdm/node/database/migrations/migrate-database';
import { ensureServeTables } from 'csdm/node/web-server/serve-tables';
import { resumeShareCodeQueue, setShareCodeInboxFolder } from 'csdm/node/web-server/share-code-queue';
import { checkAllTrackedUsers } from 'csdm/node/web-server/tracked-users';
import { setServeConfig } from 'csdm/node/web-server/serve-config';

export class ServeCommand extends Command {
  public static Name = 'serve';
  private port = 3000;
  private inboxFolderPath = path.resolve(process.cwd(), 'inbox');
  private apiToken = '';
  private dbHostname = '127.0.0.1';
  private dbPort = 5432;
  private dbUsername = 'postgres';
  private dbPassword = 'password';
  private dbName = 'csdm';
  private publicUrl = '';
  private sessionSecret = '';
  private steamApiKey = '';
  private trackPollMinutes = 15;
  private discordWebhookUrl = '';
  private clipPaddingSeconds = 6;
  private clipMaxSeconds = 90;
  private readonly portFlag = '--port';
  private readonly inboxFlag = '--inbox';
  private readonly tokenFlag = '--token';
  private readonly dbHostFlag = '--db-host';
  private readonly dbPortFlag = '--db-port';
  private readonly dbUserFlag = '--db-user';
  private readonly dbPasswordFlag = '--db-password';
  private readonly dbNameFlag = '--db-name';
  private readonly publicUrlFlag = '--public-url';
  private readonly sessionSecretFlag = '--session-secret';
  private readonly steamApiKeyFlag = '--steam-api-key';
  private readonly trackPollMinutesFlag = '--track-poll-minutes';
  private readonly discordWebhookFlag = '--discord-webhook';
  private readonly clipPaddingFlag = '--clip-padding';
  private readonly clipMaxFlag = '--clip-max';

  public getDescription() {
    return 'Start a local web server with auto demo ingest and highlights.';
  }

  public printHelp() {
    console.log(this.getDescription());
    console.log('');
    console.log(
      `Usage: csdm ${ServeCommand.Name} ${this.formatFlagsForHelp([this.portFlag, this.inboxFlag, this.tokenFlag, this.dbHostFlag, this.dbPortFlag, this.dbUserFlag, this.dbPasswordFlag, this.dbNameFlag, this.publicUrlFlag, this.sessionSecretFlag, this.steamApiKeyFlag, this.trackPollMinutesFlag, this.discordWebhookFlag, this.clipPaddingFlag, this.clipMaxFlag])}`,
    );
    console.log('');
    console.log(`${this.portFlag} HTTP port, default 3000. Env PORT is also supported.`);
    console.log(
      `${this.inboxFlag} inbox folder to watch, per-user subfolders inbox/<steam-id>/*.dem are auto-analyzed.`,
    );
    console.log(
      `${this.tokenFlag} require Authorization: Bearer <token> for /api/*, friends each use the same or per-deploy token.`,
    );
    console.log('Database flags (env POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB):');
    console.log(`${this.dbHostFlag} database hostname, default 127.0.0.1.`);
    console.log(`${this.dbPortFlag} database port, default 5432.`);
    console.log(`${this.dbUserFlag} database username, default postgres.`);
    console.log(`${this.dbPasswordFlag} database password.`);
    console.log(`${this.dbNameFlag} database name, default csdm.`);
    console.log(`${this.publicUrlFlag} public URL of the server, used for Steam login callbacks. Env PUBLIC_URL.`);
    console.log(`${this.sessionSecretFlag} secret used to sign login sessions. Env SESSION_SECRET.`);
    console.log(
      `${this.steamApiKeyFlag} Steam Web API key (from steamcommunity.com/dev/apikey) used to discover new matches for tracked users. Env STEAM_API_KEY.`,
    );
    console.log(
      `${this.trackPollMinutesFlag} how often tracked users are checked for new matches, default 15 minutes. Env TRACK_POLL_MINUTES. 0 disables automatic checks.`,
    );
    console.log(
      `${this.discordWebhookFlag} Discord webhook URL for post-match summaries after each analyzed demo. Env DISCORD_WEBHOOK_URL.`,
    );
    console.log(
      `${this.clipPaddingFlag} seconds of context around highlight kills for on-demand clips, default 6. Env CLIP_PADDING_SECONDS.`,
    );
    console.log(`${this.clipMaxFlag} max highlight clip length in seconds, default 90. Env CLIP_MAX_SECONDS.`);
    console.log('');
    console.log('Examples:');
    console.log(`    csdm ${ServeCommand.Name} ${this.portFlag} 3000 ${this.inboxFlag} ./inbox`);
    console.log(`    csdm ${ServeCommand.Name} ${this.portFlag} 3000 ${this.tokenFlag} secret-for-friends`);
  }

  public async run() {
    this.parseServeArgs();
    createDatabaseConnection({
      hostname: this.dbHostname,
      port: this.dbPort,
      username: this.dbUsername,
      password: this.dbPassword,
      database: this.dbName,
    });
    await migrateDatabase();
    await ensureServeTables();
    setShareCodeInboxFolder(this.inboxFolderPath);
    await resumeShareCodeQueue();
    const publicUrl = this.publicUrl || `http://localhost:${this.port}`;
    setServeConfig({
      discordWebhookUrl: this.discordWebhookUrl,
      publicUrl,
      clipPaddingSeconds: this.clipPaddingSeconds,
      clipMaxSeconds: this.clipMaxSeconds,
    });
    logger.log(`Using database ${this.dbName} on ${this.dbHostname}:${this.dbPort}`);
    console.log(`Starting server on port ${this.port}, inbox ${this.inboxFolderPath}`);
    if (this.discordWebhookUrl !== '') {
      logger.log('Discord post-match notifications enabled');
    }
    if (this.sessionSecret === '') {
      logger.warn('SESSION_SECRET is not set, login sessions use an insecure default. Set a long random secret.');
    }
    await startWebServer({
      port: this.port,
      inboxFolderPath: this.inboxFolderPath,
      apiToken: this.apiToken,
      maxUploadBytes: 1024 * 1024 * 1024,
      publicUrl,
      sessionSecret: this.sessionSecret || 'csdm-serve-insecure-default',
      steamApiKey: this.steamApiKey,
    });
    if (this.steamApiKey !== '' && this.trackPollMinutes > 0) {
      const intervalMs = this.trackPollMinutes * 60 * 1000;
      logger.log(`Checking tracked users for new matches every ${this.trackPollMinutes} minute(s)`);
      void checkAllTrackedUsers(this.steamApiKey).catch((error: unknown) => logger.error(error));
      setInterval(() => {
        void checkAllTrackedUsers(this.steamApiKey).catch((error: unknown) => logger.error(error));
      }, intervalMs);
    } else if (this.trackPollMinutes > 0) {
      logger.warn('STEAM_API_KEY is not set, automatic match tracking is disabled until it is configured.');
    }
    // Keep the process alive, the HTTP server and inbox watcher run in background.
    await new Promise(() => undefined);
  }

  private parseServeArgs() {
    super.parseArgs(this.args);
    const envPort = Number(process.env.PORT ?? '');
    if (Number.isSafeInteger(envPort) && envPort > 0) {
      this.port = envPort;
    }
    if (process.env.INBOX_DIR) {
      this.inboxFolderPath = path.resolve(process.env.INBOX_DIR);
    }
    if (process.env.API_TOKEN) {
      this.apiToken = process.env.API_TOKEN;
    }
    if (process.env.POSTGRES_HOST) {
      this.dbHostname = process.env.POSTGRES_HOST;
    }
    const envDbPort = Number(process.env.POSTGRES_PORT ?? '');
    if (Number.isSafeInteger(envDbPort) && envDbPort > 0) {
      this.dbPort = envDbPort;
    }
    if (process.env.POSTGRES_USER) {
      this.dbUsername = process.env.POSTGRES_USER;
    }
    if (process.env.POSTGRES_PASSWORD) {
      this.dbPassword = process.env.POSTGRES_PASSWORD;
    }
    if (process.env.POSTGRES_DB) {
      this.dbName = process.env.POSTGRES_DB;
    }
    if (process.env.PUBLIC_URL) {
      this.publicUrl = process.env.PUBLIC_URL.replace(/\/$/, '');
    }
    if (process.env.SESSION_SECRET) {
      this.sessionSecret = process.env.SESSION_SECRET;
    }
    if (process.env.STEAM_API_KEY) {
      this.steamApiKey = process.env.STEAM_API_KEY;
    }
    if (process.env.DISCORD_WEBHOOK_URL) {
      this.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    }
    const envClipPadding = Number(process.env.CLIP_PADDING_SECONDS ?? '6');
    if (Number.isSafeInteger(envClipPadding) && envClipPadding >= 0) {
      this.clipPaddingSeconds = envClipPadding;
    }
    const envClipMax = Number(process.env.CLIP_MAX_SECONDS ?? '');
    if (Number.isSafeInteger(envClipMax) && envClipMax > 0) {
      this.clipMaxSeconds = envClipMax;
    }
    const envPollMinutes = Number(process.env.TRACK_POLL_MINUTES ?? '15');
    if (Number.isSafeInteger(envPollMinutes) && envPollMinutes >= 0) {
      this.trackPollMinutes = envPollMinutes;
    }

    for (let index = 0; index < this.args.length; index++) {
      const arg = this.args[index];
      if (!this.isFlagArgument(arg)) {
        console.log(`Unknown argument: ${arg}`);
        this.exitWithFailure();
      }
      switch (arg) {
        case this.portFlag: {
          const value = this.args[index + 1];
          const parsed = Number(value);
          if (!Number.isSafeInteger(parsed) || parsed <= 0) {
            console.log(`Invalid ${this.portFlag} value`);
            this.exitWithFailure();
          }
          this.port = parsed;
          index += 1;
          break;
        }
        case this.inboxFlag: {
          const value = this.args[index + 1];
          if (!value) {
            console.log(`Missing ${this.inboxFlag} value`);
            this.exitWithFailure();
          }
          this.inboxFolderPath = path.resolve(value);
          index += 1;
          break;
        }
        case this.tokenFlag: {
          const value = this.args[index + 1];
          if (!value) {
            console.log(`Missing ${this.tokenFlag} value`);
            this.exitWithFailure();
          }
          this.apiToken = value;
          index += 1;
          break;
        }
        case this.dbHostFlag: {
          const value = this.args[index + 1];
          if (!value) {
            console.log(`Missing ${this.dbHostFlag} value`);
            this.exitWithFailure();
          }
          this.dbHostname = value;
          index += 1;
          break;
        }
        case this.dbPortFlag: {
          const value = this.args[index + 1];
          const parsed = Number(value);
          if (!Number.isSafeInteger(parsed) || parsed <= 0) {
            console.log(`Invalid ${this.dbPortFlag} value`);
            this.exitWithFailure();
          }
          this.dbPort = parsed;
          index += 1;
          break;
        }
        case this.dbUserFlag: {
          const value = this.args[index + 1];
          if (!value) {
            console.log(`Missing ${this.dbUserFlag} value`);
            this.exitWithFailure();
          }
          this.dbUsername = value;
          index += 1;
          break;
        }
        case this.dbPasswordFlag: {
          const value = this.args[index + 1];
          if (!value) {
            console.log(`Missing ${this.dbPasswordFlag} value`);
            this.exitWithFailure();
          }
          this.dbPassword = value;
          index += 1;
          break;
        }
        case this.dbNameFlag: {
          const value = this.args[index + 1];
          if (!value) {
            console.log(`Missing ${this.dbNameFlag} value`);
            this.exitWithFailure();
          }
          this.dbName = value;
          index += 1;
          break;
        }
        case this.publicUrlFlag: {
          const value = this.args[index + 1];
          if (!value) {
            console.log(`Missing ${this.publicUrlFlag} value`);
            this.exitWithFailure();
          }
          this.publicUrl = value.replace(/\/$/, '');
          index += 1;
          break;
        }
        case this.sessionSecretFlag: {
          const value = this.args[index + 1];
          if (!value) {
            console.log(`Missing ${this.sessionSecretFlag} value`);
            this.exitWithFailure();
          }
          this.sessionSecret = value;
          index += 1;
          break;
        }
        case this.steamApiKeyFlag: {
          const value = this.args[index + 1];
          if (!value) {
            console.log(`Missing ${this.steamApiKeyFlag} value`);
            this.exitWithFailure();
          }
          this.steamApiKey = value;
          index += 1;
          break;
        }
        case this.trackPollMinutesFlag: {
          const value = this.args[index + 1];
          const parsed = Number(value);
          if (!Number.isSafeInteger(parsed) || parsed < 0) {
            console.log(`Invalid ${this.trackPollMinutesFlag} value`);
            this.exitWithFailure();
          }
          this.trackPollMinutes = parsed;
          index += 1;
          break;
        }
        case this.discordWebhookFlag: {
          const value = this.args[index + 1];
          if (!value) {
            console.log(`Missing ${this.discordWebhookFlag} value`);
            this.exitWithFailure();
          }
          this.discordWebhookUrl = value;
          index += 1;
          break;
        }
        case this.clipPaddingFlag: {
          const value = this.args[index + 1];
          const parsed = Number(value);
          if (!Number.isSafeInteger(parsed) || parsed < 0) {
            console.log(`Invalid ${this.clipPaddingFlag} value`);
            this.exitWithFailure();
          }
          this.clipPaddingSeconds = parsed;
          index += 1;
          break;
        }
        case this.clipMaxFlag: {
          const value = this.args[index + 1];
          const parsed = Number(value);
          if (!Number.isSafeInteger(parsed) || parsed <= 0) {
            console.log(`Invalid ${this.clipMaxFlag} value`);
            this.exitWithFailure();
          }
          this.clipMaxSeconds = parsed;
          index += 1;
          break;
        }
        default: {
          console.log(`Unknown flag: ${arg}`);
          this.exitWithFailure();
        }
      }
    }
  }
}
