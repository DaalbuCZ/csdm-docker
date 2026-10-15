export async function getRunningProcessExitCode(processName: string): Promise<number> {
  // This Windows-only binding must not be loaded by the Linux rendering worker.
  // oxlint-disable-next-line typescript/no-require-imports
  const nativeModule = require('./build/Release/get_running_process_exit_code.node');
  logger.debug(`Waiting for process ${processName} to exit`);
  const exitCode = await nativeModule.getRunningProcessExitCode(processName);
  logger.debug(`Process ${processName} exited with code ${exitCode}`);

  return exitCode;
}
