import { describe, expect, it, vi } from 'vite-plus/test';
import { analyzeDemo, DemoSource } from '@akiver/cs-demo-analyzer';
import { runDemoAnalyzer } from './run-demo-analyzer';

vi.mock('@akiver/cs-demo-analyzer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@akiver/cs-demo-analyzer')>()),
  analyzeDemo: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('csdm/node/filesystem/get-static-folder-path', () => ({ getStaticFolderPath: () => '/static' }));

describe('analyzer source selection', () => {
  it('lets the binary detect unknown server demos instead of passing an unsupported source', async () => {
    await runDemoAnalyzer({ demoPath: '/demo.dem', outputFolderPath: '/output', source: DemoSource.Unknown });
    expect(analyzeDemo).toHaveBeenLastCalledWith(expect.objectContaining({ source: undefined }));
  });

  it('preserves an explicitly detected provider', async () => {
    await runDemoAnalyzer({ demoPath: '/demo.dem', outputFolderPath: '/output', source: DemoSource.MatchZy });
    expect(analyzeDemo).toHaveBeenLastCalledWith(expect.objectContaining({ source: DemoSource.MatchZy }));
  });
});
