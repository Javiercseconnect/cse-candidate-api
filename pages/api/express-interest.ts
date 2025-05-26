import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { logInterestExpression } from '@/lib/airtable'; // Adjusted import

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

    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS ||
      !process.env.NOTIFICATION_EMAIL
    ) {
      console.error('API: Express Interest - SMTP env vars not configured');
      // Do not throw an error that would expose config issues to client,
      // but log it and potentially send a generic success if Airtable log worked,
      // or a specific error if email is critical. For now, let's assume email is critical.
      return res.status(500).json({ message: 'Email server configuration error on server.' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', // True for 465, false for other ports like 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const emailContent = `
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

    await transporter.sendMail({
      from: `"CSE Connect Notifications" <${process.env.SMTP_USER}>`, // Using a display name
      to: process.env.NOTIFICATION_EMAIL,
      subject: `New Interest Expression - ${organization} for Candidate ID ${candidateId}`,
      html: emailContent,
    });

    const confirmationContent = `
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

    await transporter.sendMail({
      from: `"CSE Connect Team" <${process.env.SMTP_USER}>`, // Using a display name
      to: email, // Client's email
      subject: 'Thank you for your interest - CSE Connect',
      html: confirmationContent,
    });

    res.status(200).json({ 
      message: 'Interest expression submitted successfully',
      success: true 
    });

  } catch (error) {
    console.error('API: Express Interest - Error processing interest expression:', error);
    res.status(500).json({ 
      message: 'Failed to process interest expression',
      success: false 
    });
  }
}
