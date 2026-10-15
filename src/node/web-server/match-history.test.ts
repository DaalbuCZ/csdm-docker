import { describe, it, expect, vi, afterEach } from 'vite-plus/test';
import { request } from 'undici';
import { getAllNewMatchCodes } from './match-history';

vi.mock('undici', () => ({ request: vi.fn() }));
const options = {
  apiKey: 'key',
  steamId: '76561198000000000',
  authCode: 'auth',
  startCode: 'CSGO-Mixed-Case',
  maxCodes: 30,
};

afterEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
});

describe('Steam match tracking', () => {
  it('accepts an empty HTTP 202 without trying to parse JSON', async () => {
    const dump = vi.fn();
    const json = vi.fn();
    vi.mocked(request).mockResolvedValue({ statusCode: 202, body: { dump, json } } as unknown as Awaited<
      ReturnType<typeof request>
    >);
    expect(await getAllNewMatchCodes(options)).toEqual([]);
    expect(dump).toHaveBeenCalledOnce();
    expect(json).not.toHaveBeenCalled();
    expect((vi.mocked(request).mock.calls[0][0] as URL).href).toContain('knowncode=CSGO-Mixed-Case');
  });

  it('stops when Steam repeats the current share code', async () => {
    vi.mocked(request).mockResolvedValue({
      statusCode: 200,
      body: { json: () => Promise.resolve({ result: { nextcode: options.startCode } }) },
    } as unknown as Awaited<ReturnType<typeof request>>);
    expect(await getAllNewMatchCodes(options)).toEqual([]);
    expect(request).toHaveBeenCalledOnce();
  });

  it('walks new codes without changing case and stops at the newest match', async () => {
    vi.useFakeTimers();
    vi.mocked(request)
      .mockResolvedValueOnce({
        statusCode: 200,
        body: { json: () => Promise.resolve({ result: { nextcode: 'CSGO-New-Code' } }) },
      } as unknown as Awaited<ReturnType<typeof request>>)
      .mockResolvedValueOnce({ statusCode: 202, body: { dump: () => Promise.resolve() } } as unknown as Awaited<
        ReturnType<typeof request>
      >);
    const result = getAllNewMatchCodes(options);
    await vi.runAllTimersAsync();
    expect(await result).toEqual(['CSGO-New-Code']);
    expect((vi.mocked(request).mock.calls[1][0] as URL).href).toContain('knowncode=CSGO-New-Code');
  });
});
