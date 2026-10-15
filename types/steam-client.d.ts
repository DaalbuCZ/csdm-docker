declare module 'steam-user' {
  import { EventEmitter } from 'node:events';

  export default class SteamUser extends EventEmitter {
    public constructor(options?: {
      autoRelogin?: boolean;
      renewRefreshTokens?: boolean;
      dataDirectory?: string | null;
    });
    public logOn(details: { refreshToken: string }): void;
    public logOff(): void;
    public gamesPlayed(apps: number[]): void;
  }
}

declare module 'globaloffensive' {
  import { EventEmitter } from 'node:events';
  import type SteamUser from 'steam-user';

  export default class GlobalOffensive extends EventEmitter {
    public constructor(client: SteamUser);
    public requestGame(shareCode: string): void;
  }
}
