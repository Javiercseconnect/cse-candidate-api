import type { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';

// Initialize Airtable connection specifically for this route.
// Ensure your .env.local (when deployed to Vercel, these will be Vercel Environment Variables)
// has AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and AIRTABLE_CAMPAIGNS_TABLE_ID

const airtableBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const campaignsTable = airtableBase(process.env.AIRTABLE_CAMPAIGNS_TABLE_ID!);

interface ValidationResponse {
  isValid: boolean;
  message?: string;
  accessCode?: string; // Return the validated code for consistency
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidationResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ isValid: false, message: 'Method not allowed' });
  }

  const { accessCode } = req.body;

  if (!accessCode || typeof accessCode !== 'string') {
    return res.status(400).json({ isValid: false, message: 'Access code is required' });
  }

  if (!process.env.AIRTABLE_CAMPAIGNS_TABLE_ID || !process.env.AIRTABLE_BASE_ID || !process.env.AIRTABLE_API_KEY) {
    console.error('API: Validate Access Code - Airtable env vars not configured');
    return res.status(500).json({ isValid: false, message: 'Server configuration error.' });
  }
  
  const codeToValidate = accessCode.toUpperCase(); 

  try {
    const records = await campaignsTable
      .select({
        filterByFormula: `AND(UPPER({Access Code}) = "${codeToValidate}", {Status} = "Active")`,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length > 0) {
      res.status(200).json({ isValid: true, accessCode: codeToValidate });
    } else {
      res.status(401).json({ isValid: false, message: 'Invalid or inactive access code.' });
    }
  } catch (error) {
    console.error('API: Validate Access Code - Error querying Airtable:', error);
    res.status(500).json({ isValid: false, message: 'Error validating access code.' });
  }
}
