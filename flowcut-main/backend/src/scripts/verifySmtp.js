import { verifyMailTransport } from '../services/mailService.js';

const result = await verifyMailTransport();

if (result.ok) {
  console.log('[mail] SMTP connection and authentication succeeded.');
  process.exit(0);
}

if (result.missing) {
  const missing = Object.entries(result.missing)
    .filter(([, isMissing]) => isMissing)
    .map(([key]) => key);
  console.error(`[mail] SMTP verification not attempted; missing: ${missing.join(', ')}.`);
} else {
  const { code, responseCode, command, message } = result.error;
  console.error(
    `[mail] SMTP verification failed: code=${code}` +
      `${responseCode ? ` responseCode=${responseCode}` : ''}` +
      `${command ? ` command=${command}` : ''} message=${message}`
  );
}

process.exit(1);
