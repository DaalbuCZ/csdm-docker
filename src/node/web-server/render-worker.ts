import 'csdm/cli/cli-setup';
import 'csdm/node/logger';
import path from 'node:path';
import fs from 'fs-extra';
import { createDatabaseConnection, db } from 'csdm/node/database/database';
import { fetchMatchTable } from 'csdm/node/database/matches/fetch-match-table';
import { fetchHighlightClip } from 'csdm/node/web-server/highlight-clips';
import {
  buildRenderSequence,
  claimRenderJob,
  finishRenderJob,
  getRenderedVideoPath,
  renewRenderLease,
} from 'csdm/node/web-server/render-queue';
import { generateVideo } from 'csdm/node/video/generation/generate-video';
import { getSequenceOutputFilePath } from 'csdm/node/video/generation/get-sequence-output-file-path';
import { updateSettings } from 'csdm/node/settings/update-settings';
import { getSettings } from 'csdm/node/settings/get-settings';
import { RecordingSystem } from 'csdm/common/types/recording-system';
import { RecordingOutput } from 'csdm/common/types/recording-output';
import { EncoderSoftware } from 'csdm/common/types/encoder-software';
import { VideoContainer } from 'csdm/common/types/video-container';
import { sleep } from 'csdm/common/sleep';
import { prepareSharedCs2 } from 'csdm/node/web-server/prepare-shared-cs2';

async function run() {
  createDatabaseConnection({
    hostname: process.env.POSTGRES_HOST || 'db',
    port: Number(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DB || 'csdm',
  });
  await updateSettings({
    playback: {
      customCs2LocationEnabled: Boolean(process.env.CS2_EXECUTABLE),
      cs2ExecutablePath: process.env.CS2_EXECUTABLE || '',
      followSymbolicLinks: true,
    },
    video: {
      ffmpegSettings: {
        customLocationEnabled: true,
        customExecutableLocation: '/usr/bin/ffmpeg',
        videoContainer: VideoContainer.MP4,
        audioCodec: 'aac',
        videoCodec: 'libx264',
      },
    },
  });
  logger.log('Linux highlight worker ready; waiting for jobs.');
  while (true) {
    try {
      const job = await claimRenderJob();
      if (!job) {
        await sleep(5000);
        continue;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2 * 60 * 60 * 1000);
      const heartbeat = setInterval(() => {
        void renewRenderLease(job).catch((error: unknown) => {
          logger.error(error);
          controller.abort();
        });
      }, 30_000);
      try {
        if (process.env.SHARED_CS2_DIR) {
          const executable = await prepareSharedCs2(process.env.SHARED_CS2_DIR, '/config/csdm-cs2');
          await updateSettings({ playback: { customCs2LocationEnabled: true, cs2ExecutablePath: executable } });
        }
        const match = await fetchMatchTable(job.checksum);
        const clip = await fetchHighlightClip(job.checksum, job.round_number, job.steam_id);
        if (!clip) throw new Error('Highlight no longer exists.');
        // Recording writes a JSON actions file beside the demo. Keep this in
        // the worker's private workspace rather than the shared read-only inbox.
        const workspace = path.join('/config/csdm-jobs', job.id, job.claim);
        await fs.ensureDir(workspace);
        const demoPath = path.join(workspace, 'demo.dem');
        const demo = await db
          .selectFrom('matches')
          .select('demo_path')
          .where('checksum', '=', job.checksum)
          .executeTakeFirstOrThrow();
        await fs.copyFile(demo.demo_path, demoPath);
        const sequence = buildRenderSequence(clip);
        const settings = await getSettings();
        await generateVideo({
          videoId: job.id,
          checksum: job.checksum,
          game: match.game,
          mapName: match.mapName,
          tickrate: clip.tickrate,
          recordingSystem: RecordingSystem.CounterStrike,
          recordingOutput: RecordingOutput.Video,
          encoderSoftware: EncoderSoftware.FFmpeg,
          framerate: 30,
          width: 1920,
          height: 1080,
          closeGameAfterRecording: true,
          concatenateSequences: false,
          outputFileName: 'highlight',
          trueView: false,
          ffmpegSettings: settings.video.ffmpegSettings,
          outputFolderPath: workspace,
          demoPath,
          sequences: [sequence],
          signal: controller.signal,
          onGameStart: () => logger.log(`Rendering job ${job.id}`),
          onMoveFilesStart: () => logger.log(`Moving frames for job ${job.id}`),
          onSequenceStart: () => logger.log(`Encoding job ${job.id}`),
          onConcatenateSequencesStart: () => undefined,
        });
        await renewRenderLease(job);
        const output = getSequenceOutputFilePath(workspace, sequence, VideoContainer.MP4);
        if ((await fs.stat(output)).size === 0) throw new Error('The renderer produced an empty video.');
        const destination = getRenderedVideoPath(job.id);
        await fs.ensureDir(path.dirname(destination));
        await fs.copyFile(output, `${destination}.part`);
        await fs.move(`${destination}.part`, destination, { overwrite: true });
        await finishRenderJob(job);
        await fs.remove(workspace);
        logger.log(`Completed render job ${job.id}`);
      } catch (error) {
        logger.error(error);
        await finishRenderJob(job, error instanceof Error ? error.message : String(error));
      } finally {
        clearInterval(heartbeat);
        clearTimeout(timeout);
      }
    } catch (error) {
      logger.error(error);
      await sleep(5000);
    }
  }
}

void run().catch((error: unknown) => {
  logger.error(error);
  process.exitCode = 1;
});
