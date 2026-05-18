import { LibSQLStore } from '@mastra/core/storage/libsql';

const DEFAULT_STORAGE_WARNING = 'The default storage is deprecated';

class ProjectStorage extends LibSQLStore {
  private patchedLogger: unknown;

  constructor() {
    super({
      config: {
        url: 'file:../mastra.db',
      },
    });

    this.patchLogger();
  }

  override __setLogger(logger: Parameters<LibSQLStore['__setLogger']>[0]) {
    super.__setLogger(logger);
    this.patchLogger();
  }

  private patchLogger() {
    if (this.patchedLogger === this.logger) {
      return;
    }

    const originalWarn = this.logger.warn.bind(this.logger);

    this.logger.warn = ((message: unknown, ...args: unknown[]) => {
      if (
        typeof message === 'string' &&
        message.includes(DEFAULT_STORAGE_WARNING)
      ) {
        return;
      }

      originalWarn(message as never, ...(args as never[]));
    }) as typeof this.logger.warn;

    this.patchedLogger = this.logger;
  }
}

export const storage = new ProjectStorage();
