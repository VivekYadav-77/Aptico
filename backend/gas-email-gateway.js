/**
 * Aptico - Google Apps Script Email Gateway
 * ==========================================
 *
 * SETUP INSTRUCTIONS
 * ------------------
 * 1. Open https://script.google.com -> New project.
 * 2. Paste this entire file into the editor (replace any existing code).
 * 3. Click the gear icon (Project Settings) -> Script Properties -> Add:
 *      Key:   APTICO_EMAIL_SECRET
 *      Value: <the same long random string you put in GAS_EMAIL_DISPATCH_TOKEN in your .env>
 * 4. Click Deploy -> New deployment -> Web app:
 *      - Execute as:  Me (your Google account)
 *      - Who has access: Anyone
 * 5. Authorise when prompted (GmailApp requires OAuth consent).
 * 6. Copy the deployment URL and paste it into your .env as GAS_EMAIL_DISPATCH_URL.
 *
 * HOW IT WORKS
 * ------------
 * Your Node.js backend sends an HTTP POST with a JSON body:
 *   {
 *     "to":       "user@example.com",
 *     "subject":  "Verify your Aptico email address",
 *     "htmlBody": "<full HTML string>",
 *     "secret":   "<your shared secret>"
 *   }
 *
 * This script:
 *   1. Validates the shared secret against the Script Property.
 *   2. Validates required fields are present and well-formed.
 *   3. Sends the email via GmailApp.sendEmail().
 *   4. Returns a JSON response { success: true } or { success: false, message: "..." }.
 *
 * IMPORTANT
 * ---------
 * - GmailApp sends as the Google account that authorised the deployment.
 * - Gmail has a ~500 emails/day limit for free accounts.
 * - This gateway is intentionally stateless - no data is stored.
 */

// -- Constants ------------------------------------------------------------------

var APP_NAME = 'Aptico';
var MAX_BODY_LENGTH = 300000; // 300 KB safety cap on HTML body size
var ALLOWED_ORIGINS = []; // Leave empty to allow all origins, or list your backend domains

// -- Helpers --------------------------------------------------------------------

/**
 * Builds a standardised JSON ContentService output.
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Returns a 200 success response.
 */
function successResponse(message) {
  return jsonResponse({ success: true, message: message || 'Email sent.' });
}

/**
 * Returns a structured error response.
 * Note: Apps Script always returns HTTP 200 regardless of the "status" field.
 * The client (Node.js backend) checks the "success" field in the JSON body.
 */
function errorResponse(message, code) {
  return jsonResponse({ success: false, message: message, code: code || 'UNKNOWN_ERROR' });
}

/**
 * Reads the shared secret from Script Properties.
 * Configure via Project Settings → Script Properties.
 */
function getSecretFromProperties() {
  try {
    return PropertiesService.getScriptProperties().getProperty('APTICO_EMAIL_SECRET') || '';
  } catch (e) {
    return '';
  }
}

/**
 * Checks that a string looks like a valid email address.
 * Basic sanity check - not an RFC-compliant validator.
 */
function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  var trimmed = value.trim();
  return trimmed.length > 5 && trimmed.indexOf('@') > 0 && trimmed.indexOf('.') > 0;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Compares two strings character-by-character regardless of where they differ.
 */
function safeStringEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) {
    // Still iterate to avoid early exit leaking length information
    var dummy = 0;
    for (var i = 0; i < Math.max(a.length, b.length); i++) {
      dummy += (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return false;
  }
  var diff = 0;
  for (var j = 0; j < a.length; j++) {
    diff |= a.charCodeAt(j) ^ b.charCodeAt(j);
  }
  return diff === 0;
}

// -- Core handler ---------------------------------------------------------------

/**
 * doPost(e)
 *
 * Entry point for all HTTP POST requests.
 * Google Apps Script calls this function automatically.
 *
 * Expected JSON body:
 *   {
 *     "to":       string   - recipient email address
 *     "subject":  string   - email subject line
 *     "htmlBody": string   - full HTML email body
 *     "secret":   string   - shared secret for authentication
 *   }
 */
function doPost(e) {
  // -- 1. Parse request body --------------------------------------------------
  var payload;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return errorResponse('Request body is empty.', 'EMPTY_BODY');
    }
    payload = JSON.parse(e.postData.contents);
  } catch (parseError) {
    return errorResponse('Request body must be valid JSON.', 'INVALID_JSON');
  }

  // -- 2. Validate shared secret ----------------------------------------------
  var expectedSecret = getSecretFromProperties();

  if (!expectedSecret) {
    // Script property not configured — refuse all requests until it is set up.
    return errorResponse(
      'Email gateway is not configured. Set APTICO_EMAIL_SECRET in Script Properties.',
      'GATEWAY_NOT_CONFIGURED'
    );
  }

  var incomingSecret = String(payload.secret || '');

  if (!safeStringEqual(incomingSecret, expectedSecret)) {
    return errorResponse('Unauthorized: invalid secret key.', 'UNAUTHORIZED');
  }

  // -- 3. Validate required fields --------------------------------------------
  var to = String(payload.to || '').trim();
  var subject = String(payload.subject || '').trim();
  var htmlBody = String(payload.htmlBody || '').trim();

  if (!isValidEmail(to)) {
    return errorResponse('Field "to" must be a valid email address.', 'INVALID_TO');
  }

  if (!subject || subject.length < 2) {
    return errorResponse('Field "subject" is required and must not be empty.', 'INVALID_SUBJECT');
  }

  if (!htmlBody || htmlBody.length < 10) {
    return errorResponse('Field "htmlBody" is required and must not be empty.', 'INVALID_BODY');
  }

  if (htmlBody.length > MAX_BODY_LENGTH) {
    return errorResponse(
      'Field "htmlBody" exceeds maximum allowed size (' + MAX_BODY_LENGTH + ' bytes).',
      'BODY_TOO_LARGE'
    );
  }

  // -- 4. Send email via GmailApp ---------------------------------------------
  try {
    GmailApp.sendEmail(to, subject, '', {
      htmlBody: htmlBody,
      name: APP_NAME,
      noReply: true
    });

    return successResponse('Email delivered to ' + to + '.');
  } catch (sendError) {
    var errorMessage = sendError && sendError.message ? sendError.message : 'Unknown error.';

    // Log the error to the Apps Script execution log for debugging
    console.error('[Aptico Email Gateway] GmailApp.sendEmail failed:', errorMessage);

    return errorResponse(
      'Failed to send email: ' + errorMessage,
      'GMAIL_SEND_FAILED'
    );
  }
}

/**
 * doGet(e)
 *
 * Handles GET requests - returns a health-check response.
 * Useful to verify the deployment URL is active without sending email.
 */
function doGet(e) {
  return jsonResponse({
    status: 'ok',
    service: APP_NAME + ' Email Gateway',
    version: '1.0.0',
    message: 'POST requests only. Include to, subject, htmlBody, and secret.'
  });
}
