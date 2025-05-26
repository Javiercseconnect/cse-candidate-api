import type { NextApiRequest, NextApiResponse } from 'next';
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend-node";
import { logInterestExpression } from '@/lib/airtable';

interface ExpressInterestRequest {
  candidateId: string;
  clientName: string;
  organization: string;
  email: string;
  phone?: string;
  notes?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle OPTIONS preflight request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { candidateId, clientName, organization, email, phone, notes }: ExpressInterestRequest = req.body;

    if (!candidateId || !clientName || !organization || !email) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Log the interest expression to Airtable (optional)
    try {
      await logInterestExpression(candidateId, {
        name: clientName,
        organization,
        email,
        phone,
        notes,
      });
    } catch (error) {
      console.error('API: Express Interest - Failed to log to Airtable:', error);
      // Continue even if Airtable logging fails
    }

    // --- MailerSend Integration ---
    if (!process.env.MAILERSEND_API_KEY || !process.env.NOTIFICATION_EMAIL) {
      console.error('API: Express Interest - MailerSend API Key or Notification Email env var not configured');
      return res.status(500).json({ message: 'Email server configuration error on server (MailerSend).' });
    }

    const mailerSend = new MailerSend({
      apiKey: process.env.MAILERSEND_API_KEY,
    });

    const fromSender = new Sender("info@cseconnect.ie", "CSE Connect Notifications");
    const adminRecipient = [new Recipient(process.env.NOTIFICATION_EMAIL, "Admin Team")];
    const clientRecipient = [new Recipient(email, clientName)];

    // 1. Email to Admin
    const adminEmailHtml = `
      <h2>New Interest Expression - CSE Connect Candidate Dashboard</h2>
      <h3>Client Information:</h3>
      <ul>
        <li><strong>Name:</strong> ${clientName}</li>
        <li><strong>Organization:</strong> ${organization}</li>
        <li><strong>Email:</strong> ${email}</li>
        ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
      </ul>
      <h3>Candidate Details:</h3>
      <ul>
        <li><strong>Candidate ID:</strong> ${candidateId}</li>
      </ul>
      ${notes ? `<h3>Additional Notes:</h3><p>${notes}</p>` : ''}
      <hr><p><em>This notification was sent from the CSE Connect Candidate Dashboard.</em></p>
    `;
    const adminEmailParams = new EmailParams()
      .setFrom(fromSender)
      .setTo(adminRecipient)
      .setSubject(`New Interest Expression - ${organization} for Candidate ID ${candidateId}`)
      .setHtml(adminEmailHtml);

    await mailerSend.email.send(adminEmailParams);
    console.log(`Admin notification email sent to ${process.env.NOTIFICATION_EMAIL} via MailerSend.`);

    // 2. Confirmation Email to Client
    const clientConfirmationHtml = `
      <h2>Thank you for your interest!</h2>
      <p>Dear ${clientName},</p>
      <p>Thank you for expressing interest in one of our healthcare professionals through the CSE Connect platform.</p>
      <p>We have received your inquiry and our team will review your requirements and get back to you within 24 hours.</p>
      <h3>Your submission details:</h3>
      <ul>
        <li><strong>Organization:</strong> ${organization}</li>
        <li><strong>Contact Email:</strong> ${email}</li>
        ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
      </ul>
      <p>If you have any urgent requirements or questions, please don't hesitate to contact us directly.</p>
      <p>Best regards,<br>The CSE Connect Team</p>
      <hr><p><em>CSE Connect - Connecting Healthcare Professionals</em></p>
    `;
    const clientEmailParams = new EmailParams()
      .setFrom(fromSender) // Using the same verified sender
      .setTo(clientRecipient)
      .setSubject('Thank you for your interest - CSE Connect')
      .setHtml(clientConfirmationHtml);
      
    await mailerSend.email.send(clientEmailParams);
    console.log(`Client confirmation email sent to ${email} via MailerSend.`);

    res.status(200).json({ 
      message: 'Interest expression submitted successfully',
      success: true 
    });

  } catch (error: any) {
    console.error('API: Express Interest - Error processing interest expression with MailerSend:', error.body || error.message || error);
    // MailerSend errors often have details in error.body
    let errorMessage = 'Failed to process interest expression.';
    if (error.body && error.body.message) {
        errorMessage = `MailerSend Error: ${error.body.message}`;
    } else if (error.message) {
        errorMessage = error.message;
    }
    res.status(500).json({ 
      message: errorMessage,
      success: false 
    });
  }
}
