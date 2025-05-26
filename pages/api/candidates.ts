import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchActiveCampaignByAccessCode, fetchCandidatesByIds } from '@/lib/airtable'; // Adjusted import
import { Candidate } from '@/types/candidate'; // Adjusted import

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Candidate[] | { message: string }>
) {
  // Handle OPTIONS preflight request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { accessCode } = req.query;

  if (!accessCode || typeof accessCode !== 'string') {
    return res.status(400).json({ message: 'Access code is required' });
  }

  if (
    !process.env.AIRTABLE_API_KEY ||
    !process.env.AIRTABLE_BASE_ID ||
    (!process.env.AIRTABLE_CANDIDATES_TABLE_ID && !process.env.AIRTABLE_TABLE_ID) || 
    !process.env.AIRTABLE_CAMPAIGNS_TABLE_ID
  ) {
    console.error('API: Candidates - Airtable env vars not configured');
    return res.status(500).json({ message: 'Server configuration error. Please contact support.' });
  }

  try {
    const campaign = await fetchActiveCampaignByAccessCode(accessCode);

    if (!campaign) {
      return res.status(403).json({ message: 'This campaign link has expired or is invalid. Please contact us for assistance.' });
    }
    
    if (campaign.candidateRecordIds.length === 0) {
      // Campaign is valid but has no candidates linked
      console.log(`Successfully fetched 0 candidates for campaign ${campaign.id} using access code ${accessCode}`);
      return res.status(200).json([]);
    }

    const candidates = await fetchCandidatesByIds(campaign.candidateRecordIds);
    console.log(`Successfully fetched ${candidates.length} candidates for campaign ${campaign.id} using access code ${accessCode}`);
    res.status(200).json(candidates);

  } catch (error: any) {
    console.error(`API: Candidates - Error fetching candidates for access code ${accessCode}:`, error);
    // Check if the error message is one we want to pass to the client
    if (error.message && (error.message.includes('Campaigns table ID missing') || error.message.includes('Candidates table ID missing'))) {
        return res.status(500).json({ message: 'Server configuration error. Please check logs.' });
    }
    // For other errors, provide a generic message or a specific one if safe
    res.status(500).json({ message: error.message || 'Failed to fetch candidate data.' });
  }
}
