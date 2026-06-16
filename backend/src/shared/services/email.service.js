/**
 * emailService.js
 *
 * Provider-agnostic email dispatch layer for Aptico.
 *
 * Current provider: Google Apps Script (GAS) via HTTP POST.
 *
 * Architecture notes:
 * ─────────────────────────────────────────────────────────
 * • authService.js calls sendAuthEmail() - it knows NOTHING about HTTP or GAS.
 * • This file contains all transport logic.
 * • To swap providers (Resend, SendGrid, AWS SES), only this file changes.
 * • A shared secret (GAS_EMAIL_DISPATCH_TOKEN) is sent in both a header and
 *   the JSON body so the Apps Script can validate origin.
 * ─────────────────────────────────────────────────────────
 */

import { env } from '../../config/env.js';
import { emailDeliveryLogs } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

// ── Error factory ──────────────────────────────────────────────────────────────

function createEmailError(message, statusCode = 502, code = 'EMAIL_SEND_FAILED') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/**
 * Escapes HTML characters in user input to prevent HTML injection in emails.
 */
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function decodeHeaderValue(value) {
  if (!value) return null;
  try {
    return decodeURIComponent(String(value));
  } catch {
    return String(value);
  }
}

function deriveRequestLocation(request) {
  const headers = request?.headers || {};
  return {
    country: decodeHeaderValue(headers['cf-ipcountry'] || headers['x-vercel-ip-country']) || 'Unknown',
    region: decodeHeaderValue(headers['x-vercel-ip-country-region'] || headers['cf-region']) || null,
    city: decodeHeaderValue(headers['x-vercel-ip-city'] || headers['cf-ipcity']) || null
  };
}

function sanitizeErrorMessage(error) {
  const message = String(error?.message || 'Email dispatch failed.').replace(/\s+/g, ' ').trim();
  return message.slice(0, 240);
}

async function createEmailDeliveryLog({ db, request, email, userId, emailType, provider, subject }) {
  if (!db) return null;

  try {
    const location = deriveRequestLocation(request);
    const [row] = await db
      .insert(emailDeliveryLogs)
      .values({
        email,
        userId: userId || null,
        emailType,
        provider,
        status: 'pending',
        subject,
        country: location.country,
        region: location.region,
        city: location.city
      })
      .returning({ id: emailDeliveryLogs.id });

    return row?.id || null;
  } catch (error) {
    console.warn('[emailService] Could not create email delivery log:', error?.message || error);
    return null;
  }
}

async function updateEmailDeliveryLog({ db, id, status, error = null }) {
  if (!db || !id) return;

  try {
    await db
      .update(emailDeliveryLogs)
      .set({
        status,
        deliveredAt: status === 'sent' ? new Date() : null,
        errorCode: error?.code || null,
        errorMessage: error ? sanitizeErrorMessage(error) : null
      })
      .where(eq(emailDeliveryLogs.id, id));
  } catch (updateError) {
    console.warn('[emailService] Could not update email delivery log:', updateError?.message || updateError);
  }
}

// ── HTML template builders ─────────────────────────────────────────────────────

/**
 * Wraps any inner HTML block with the shared transactional email shell.
 * The shell uses inline styles for maximum email client compatibility.
 */
function buildEmailShell({ appName, previewText, innerHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appName}</title>
  <meta name="x-apple-disable-message-reformatting" />
</head>
<body style="margin:0;padding:0;background-color:#0a0f1a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <!--[if mso]><table role="presentation" width="100%"><tr><td><![endif]-->
  <span style="display:none;max-height:0;overflow:hidden;">${previewText}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a0f1a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:26px;font-weight:900;letter-spacing:-0.05em;color:#4ade80;">
                ${appName}
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#111827;border-radius:16px;border:1px solid #1f2937;padding:40px 48px;">
              ${innerHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="color:#4b5563;font-size:11px;line-height:1.6;margin:0;">
                This email was sent to you by ${appName}.<br/>
                If you did not request this, please ignore it - no action is required.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;
}

/**
 * Builds the HTML body for an email verification message.
 */
function buildVerificationEmailHtml({ name, appName, verificationLink, expiryHours = 24 }) {
  const safeName = escapeHtml(name);
  const greeting = safeName ? `Hi ${safeName},` : 'Hi there,';
  return buildEmailShell({
    appName,
    previewText: `Verify your ${appName} account - link expires in ${expiryHours} hours`,
    innerHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f9fafb;letter-spacing:-0.03em;">
        Verify your email address
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;line-height:1.7;">
        ${greeting} Thanks for joining ${appName}. Click the button below to confirm your email
        and activate your account.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <a href="${verificationLink}"
               style="display:inline-block;background-color:#4ade80;color:#052e16;font-size:14px;
                      font-weight:700;text-decoration:none;padding:14px 36px;border-radius:9999px;
                      letter-spacing:0.01em;">
              Verify my email
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin:0 0 24px;font-size:12px;color:#4ade80;word-break:break-all;">
        ${verificationLink}
      </p>
      <p style="margin:0;font-size:12px;color:#6b7280;border-top:1px solid #1f2937;padding-top:20px;">
        ⏳ This link expires in <strong style="color:#9ca3af;">${expiryHours} hours</strong>.
        After that, you can request a new one from the login screen.
      </p>`
  });
}

/**
 * Builds the HTML body for a password reset message.
 */
function buildPasswordResetEmailHtml({ name, appName, resetLink, expiryMinutes = 30 }) {
  const safeName = escapeHtml(name);
  const greeting = safeName ? `Hi ${safeName},` : 'Hi there,';
  return buildEmailShell({
    appName,
    previewText: `Reset your ${appName} password - link expires in ${expiryMinutes} minutes`,
    innerHtml: `
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#f9fafb;letter-spacing:-0.03em;">
        Reset your password
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;line-height:1.7;">
        ${greeting} We received a request to reset the password on your ${appName} account.
        Click the button below to choose a new one.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <a href="${resetLink}"
               style="display:inline-block;background-color:#4ade80;color:#052e16;font-size:14px;
                      font-weight:700;text-decoration:none;padding:14px 36px;border-radius:9999px;
                      letter-spacing:0.01em;">
              Reset my password
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin:0 0 24px;font-size:12px;color:#4ade80;word-break:break-all;">
        ${resetLink}
      </p>
      <p style="margin:0 0 8px;font-size:12px;color:#6b7280;border-top:1px solid #1f2937;padding-top:20px;">
         This link expires in <strong style="color:#9ca3af;">${expiryMinutes} minutes</strong>.
        After that, request a new reset from the login page.
      </p>
      <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">
         If you did not request a password reset, you can safely ignore this email.
        Your password will not change.
      </p>`
  });
}

// ── GAS HTTP transport ─────────────────────────────────────────────────────────

/**
 * resolveGasUrl
 *
 * Returns the first non-empty GAS endpoint URL from the environment.
 * Priority: type-specific URL → generic dispatch URL → magic-link URL.
 */
function resolveGasUrl(emailType) {
  if (emailType === 'email_verification' && env.gasEmailVerifyUrl) {
    return env.gasEmailVerifyUrl;
  }

  if (emailType === 'password_reset' && env.gasPasswordResetUrl) {
    return env.gasPasswordResetUrl;
  }

  return env.gasEmailDispatchUrl || env.gasMagicLinkUrl || null;
}

/**
 * dispatchViaGas
 *
 * Sends one email by making an HTTP POST to the deployed Google Apps Script
 * web app endpoint. The shared secret is forwarded in both an Authorization
 * header and the JSON body so the Apps Script's doPost() can validate it.
 *
 * @param {{ to: string, subject: string, htmlBody: string, emailType: string }} options
 */
async function dispatchViaGas({ to, subject, htmlBody, emailType }) {
  const url = resolveGasUrl(emailType);

  if (!url) {
    throw createEmailError(
      'Email delivery is not configured. Set GAS_EMAIL_DISPATCH_URL in your .env file.',
      503,
      'EMAIL_NOT_CONFIGURED'
    );
  }

  const secret = env.gasEmailDispatchToken || '';

  const requestBody = {
    to,
    subject,
    htmlBody,
    // The Apps Script reads 'secret' from the JSON body for validation.
    secret
  };

  const headers = {
    'Content-Type': 'application/json'
  };

  let response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      // Abort after 10 seconds to avoid holding up auth flows indefinitely.
      signal: AbortSignal.timeout(10_000)
    });
  } catch (fetchError) {
    // Log the actual technical error to the backend console securely
    console.error('[emailService] HTTP request to email gateway failed:', fetchError);

    const isTimeout = fetchError.name === 'TimeoutError' || fetchError.name === 'AbortError';
    throw createEmailError(
      isTimeout 
        ? 'The email service is taking too long to respond. Please try again.' 
        : 'We could not send the email right now. Please try again later.',
      502,
      'EMAIL_GATEWAY_UNREACHABLE'
    );
  }

  if (!response.ok) {
    // Attempt to surface GAS error message for internal debugging only.
    let gasMessage = '';

    try {
      const body = await response.json();
      gasMessage = body?.message || body?.error || '';
    } catch {
      // ignore JSON parse errors
    }

    // Log the internal gateway error securely
    console.error('[emailService] Email gateway responded with an error:', response.status, gasMessage || response.statusText);

    throw createEmailError(
      'We could not send the email right now. Please try again later.',
      502,
      'EMAIL_SEND_FAILED'
    );
  }

  return true;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * sendAuthEmail
 *
 * The single entry-point for all transactional auth emails.
 * Called by authService.js - completely decoupled from transport details.
 *
 * Supported types:
 *   • 'email_verification'  - sent after registration
 *   • 'password_reset'      - sent when a user requests a password reset
 *
 * @param {{
 *   type: 'email_verification' | 'password_reset',
 *   email: string,
 *   name?: string | null,
 *   link: string,
 *   expiresAt: string,  // ISO date string
 *   appName?: string,
 *   db?: import('drizzle-orm').NodePgDatabase,
 *   request?: import('fastify').FastifyRequest,
 *   userId?: string | null,
 *   logType?: string | null
 * }} payload
 */
export async function sendAuthEmail({
  type,
  email,
  name,
  link,
  expiresAt,
  appName = 'Aptico',
  db = null,
  request = null,
  userId = null,
  logType = null
}) {
  if (!email || !link) {
    throw createEmailError('email and link are required to send an auth email.', 400, 'EMAIL_INVALID_PAYLOAD');
  }

  const expiresAtDate = new Date(expiresAt);
  const nowMs = Date.now();
  const diffMs = expiresAtDate.getTime() - nowMs;
  const provider = 'google_apps_script';
  const deliveryEmailType = logType || type;

  let subject = '';
  let htmlBody = '';

  if (type === 'email_verification') {
    const expiryHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    subject = `Verify your ${appName} email address`;
    htmlBody = buildVerificationEmailHtml({ name, appName, verificationLink: link, expiryHours });
  } else if (type === 'password_reset') {
    const expiryMinutes = Math.max(5, Math.round(diffMs / (1000 * 60)));
    subject = `Reset your ${appName} password`;
    htmlBody = buildPasswordResetEmailHtml({ name, appName, resetLink: link, expiryMinutes });
  } else {
    throw createEmailError(`Unknown email type: "${type}".`, 400, 'EMAIL_UNKNOWN_TYPE');
  }

  const logId = await createEmailDeliveryLog({
    db,
    request,
    email,
    userId,
    emailType: deliveryEmailType,
    provider,
    subject
  });

  try {
    const result = await dispatchViaGas({ to: email, subject, htmlBody, emailType: type });
    await updateEmailDeliveryLog({ db, id: logId, status: 'sent' });
    return result;
  } catch (error) {
    await updateEmailDeliveryLog({ db, id: logId, status: 'failed', error });
    throw error;
  }
}
