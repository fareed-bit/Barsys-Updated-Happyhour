/**
 * =============================================================
 * Google Apps Script — Barsys Happy Hour Form → Google Sheets
 * =============================================================
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. Go to https://script.google.com and create a new project
 * 2. Replace the default Code.gs content with this entire file
 * 3. Click "Deploy" → "New deployment"
 * 4. Select type: "Web app"
 * 5. Set "Execute as": Me (your Google account)
 * 6. Set "Who has access": Anyone
 * 7. Click "Deploy" and copy the Web App URL
 * 8. Replace the 'endpoint' variable in main.js (line ~1050)
 *    with your new Web App URL
 *
 * GOOGLE SHEET SETUP:
 * - Create a new Google Sheet
 * - Rename the first sheet tab to "Leads"
 * - Add these headers in Row 1 (A1 through Z1):
 *
 *   A: Timestamp
 *   B: Name
 *   C: Email
 *   D: Phone
 *   E: Company
 *   F: Event Type
 *   G: Guest Count
 *   H: Experience Tier
 *   I: Mixlists
 *   J: Spirit Upgrades
 *   K: Add-Ons
 *   L: Frequency
 *   M: Recurring Cadence
 *   N: Address
 *   O: City
 *   P: State
 *   Q: Estimated Total
 *   R: UTM Source
 *   S: UTM Medium
 *   T: UTM Campaign
 *   U: UTM Term
 *   V: UTM Content
 *   W: GCLID
 *   X: FBCLID
 *   Y: Landing Page
 *   Z: Referrer
 *
 * - Copy the Sheet ID from the URL (the long string between /d/ and /edit)
 * - Paste it into SHEET_ID below
 *
 * =============================================================
 */

// ⚠️ REPLACE THIS with your actual Google Sheet ID
var SHEET_ID = '1Fh9dS0IMCnph5qwjZAe54tx3YDUIyZd9wYo31nZannc';
var SHEET_NAME = 'Leads';

/**
 * Handles POST requests from the website form
 */
function doPost(e) {
  try {
    var data;

    // Parse incoming JSON data
    if (e.postData && e.postData.type === 'application/json') {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    } else {
      return buildResponse('error', 'No data received');
    }

    // Open the spreadsheet and get the sheet
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      // Auto-create the sheet with headers if it doesn't exist
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        'Timestamp', 'Name', 'Email', 'Phone', 'Company',
        'Event Type', 'Guest Count', 'Experience Tier',
        'Mixlists', 'Spirit Upgrades', 'Add-Ons',
        'Frequency', 'Recurring Cadence',
        'Address', 'City', 'State', 'Estimated Total',
        'UTM Source', 'UTM Medium', 'UTM Campaign',
        'UTM Term', 'UTM Content', 'GCLID', 'FBCLID',
        'Landing Page', 'Referrer'
      ]);

      // Bold the header row
      sheet.getRange(1, 1, 1, 26).setFontWeight('bold');
      // Freeze header row
      sheet.setFrozenRows(1);
    }

    // Build the row data
    var timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    var row = [
      timestamp,
      data.name || '',
      data.email || '',
      data.phone || '',
      data.company || '',
      data.eventType || '',
      data.guestCount || '',
      data.experienceTier || '',
      data.mixlists || '',
      data.spiritUpgrades || 'None',
      data.addOns || 'None',
      data.frequency || '',
      data.recurringCadence || '',
      data.address || '',
      data.city || '',
      data.state || '',
      data.estimatedTotal || '',
      data.utm_source || '',
      data.utm_medium || '',
      data.utm_campaign || '',
      data.utm_term || '',
      data.utm_content || '',
      data.gclid || '',
      data.fbclid || '',
      data.landing_page || '',
      data.referrer || ''
    ];

    // Append the row
    sheet.appendRow(row);

    // Optional: Send email notification for new leads
    sendLeadNotification(data, timestamp);

    return buildResponse('success', 'Lead saved successfully');

  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return buildResponse('error', error.toString());
  }
}

/**
 * Handles GET requests (for testing the endpoint)
 */
function doGet(e) {
  return buildResponse('success', 'Barsys Happy Hour form endpoint is active. Use POST to submit data.');
}

/**
 * Build a JSON response
 */
function buildResponse(status, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: status, message: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Optional: Send email notification when a new lead comes in
 * Comment out the sendLeadNotification() call in doPost if you don't want emails
 */
function sendLeadNotification(data, timestamp) {
  var recipient = 'fareed@barsys.com'; // Change this to your notification email
  var subject = '🍸 New Barsys Event Lead — ' + (data.company || data.name || 'Unknown');

  var body = [
    'New event lead received at ' + timestamp,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'CONTACT INFORMATION',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'Name: ' + (data.name || '—'),
    'Email: ' + (data.email || '—'),
    'Phone: ' + (data.phone || '—'),
    'Company: ' + (data.company || '—'),
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'EVENT DETAILS',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'Event Type: ' + (data.eventType || '—'),
    'Guest Count: ' + (data.guestCount || '—'),
    'Experience Tier: ' + (data.experienceTier || '—'),
    'Mixlists: ' + (data.mixlists || '—'),
    'Spirit Upgrades: ' + (data.spiritUpgrades || 'None'),
    'Add-Ons: ' + (data.addOns || 'None'),
    'Frequency: ' + (data.frequency || '—'),
    'Recurring Cadence: ' + (data.recurringCadence || '—'),
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'LOCATION',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'Address: ' + (data.address || '—'),
    'City: ' + (data.city || '—'),
    'State: ' + (data.state || '—'),
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'PRICING',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'Estimated Total: ' + (data.estimatedTotal || '—'),
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'ATTRIBUTION',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'UTM Source: ' + (data.utm_source || '—'),
    'UTM Medium: ' + (data.utm_medium || '—'),
    'UTM Campaign: ' + (data.utm_campaign || '—'),
    'Landing Page: ' + (data.landing_page || '—'),
    'Referrer: ' + (data.referrer || '—'),
    '',
    '— Barsys Lead Capture System'
  ].join('\n');

  try {
    MailApp.sendEmail(recipient, subject, body);
  } catch (e) {
    Logger.log('Email notification failed: ' + e.toString());
  }
}

/**
 * One-time setup: Run this function manually to create the sheet with headers
 * Go to Run → Run function → setupSheet
 */
function setupSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Set headers
  var headers = [
    'Timestamp', 'Name', 'Email', 'Phone', 'Company',
    'Event Type', 'Guest Count', 'Experience Tier',
    'Mixlists', 'Spirit Upgrades', 'Add-Ons',
    'Frequency', 'Recurring Cadence',
    'Address', 'City', 'State', 'Estimated Total',
    'UTM Source', 'UTM Medium', 'UTM Campaign',
    'UTM Term', 'UTM Content', 'GCLID', 'FBCLID',
    'Landing Page', 'Referrer'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#1a1a1a');
  sheet.getRange(1, 1, 1, headers.length).setFontColor('#C8A97E');
  sheet.setFrozenRows(1);

  // Auto-resize columns
  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  // Set column widths for better readability
  sheet.setColumnWidth(1, 180);  // Timestamp
  sheet.setColumnWidth(2, 150);  // Name
  sheet.setColumnWidth(3, 220);  // Email
  sheet.setColumnWidth(9, 250);  // Mixlists
  sheet.setColumnWidth(10, 200); // Spirit Upgrades
  sheet.setColumnWidth(11, 200); // Add-Ons

  Logger.log('Sheet setup complete!');
}
