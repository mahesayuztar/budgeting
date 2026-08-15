import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Membuat transport pino untuk mode development: log berwarna di terminal
 * sekaligus disalin ke berkas `./logs/app.log`. Pada mode production transport
 * tidak dipakai supaya output tetap JSON satu baris.
 * @returns {pino.DestinationStream | undefined} Transport pino untuk development, atau undefined pada production.
 */
function getDevelopmentTransport() {
  if (!isDevelopment) return undefined;

  return pino.transport({
    targets: [
      {
        target: 'pino-pretty',
        level: 'debug',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      },
      {
        target: 'pino/file',
        level: 'debug',
        options: {
          destination: './logs/app.log',
          mkdir: true,
        },
      },
    ],
  });
}

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? 'info',
    base: {
      app: 'budgeting',
      env: process.env.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  getDevelopmentTransport(),
);
