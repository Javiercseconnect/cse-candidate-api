import Airtable from 'airtable';
import { Candidate } from '@/types/candidate'; // Adjusted import path

// Initialize Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID!);

// Table for Candidates - ensure AIRTABLE_CANDIDATES_TABLE_ID is set in your .env
const candidatesTable = base(process.env.AIRTABLE_CANDIDATES_TABLE_ID || process.env.AIRTABLE_TABLE_ID!);

// NEW: Table for Campaigns - ensure AIRTABLE_CAMPAIGNS_TABLE_ID is set in your .env
const campaignsTable = base(process.env.AIRTABLE_CAMPAIGNS_TABLE_ID!);

// Map Airtable record to Candidate interface
function mapAirtableToCandidate(record: any): Candidate {
  const fields = record.fields;
  
  const getArrayField = (fieldName: string): string[] => {
    const value = fields[fieldName];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') return value.split(',').map(s => s.trim());
    return [];
  };
  
  const imcStatus = (fields['IMC Registration Status'] || '').toLowerCase();
  const isImcRegistered = imcStatus === 'yes' || imcStatus === 'active';

  const rawDivision = (fields['Division'] || '').toLowerCase();
  const mappedDivision = rawDivision === 'specialist' ? 'specialist' : 'general';

  return {
    id: record.id, 
    gpCustomId: fields['GP Record ID'] || '', 
    profileSummary: fields['AI Profile Summary'] || '',
    imcRegistration: isImcRegistered,
    division: mappedDivision,
    experienceSummary: fields['Experience Summary'] || '',
    experienceYears: fields['Experience Years'] || 0,
    detailedExperience: fields['Detailed Experience'] || '',
    areaOfInterest: getArrayField('Areas of Interest'),
    languages: getArrayField('Language Proficiency'),
    availability: {
      sessionsPerWeek: {
        min: fields['Sessions per week (min)'] || 0, 
        max: fields['Sessions per Week (max)'] || fields['Sessions per week (min)'] || 0, 
      },
      startDate: fields['Availability'] || 'Immediate', 
      details: fields['Availability'] || '',
    },
    salaryExpectations: {
      min: fields['Salary min'] || 0,
      max: fields['Salary max'] || fields['Salary min'] || 0,
      currency: fields['Currency'] || 'EUR',
      period: fields['Salary period'] || 'session', 
    },
    gmsInterest: fields['GMS Interested'] || '', 
  };
}

// This function might not be directly used by the API-only project if APIs are specific,
// but keeping it for completeness if any shared logic relies on it.
// Or it can be removed if fetchCandidatesByIds and fetchActiveCampaignByAccessCode are sufficient.
export async function fetchCandidates(): Promise<Candidate[]> {
  try {
    const records = await candidatesTable.select({ 
      filterByFormula: "AND({Status} = 'Active', {AI Profile Summary} != '')", 
      sort: [{ field: 'GP Record ID', direction: 'asc' }], 
    }).all();

    return records.map(mapAirtableToCandidate);
  } catch (error) {
    console.error('Error fetching candidates from Airtable:', error);
    throw new Error('Failed to fetch candidates');
  }
}

// This function might not be directly used by the API-only project.
export async function fetchCandidateById(id: string): Promise<Candidate | null> {
  try {
    const record = await candidatesTable.find(id); 
    return mapAirtableToCandidate(record);
  } catch (error) {
    console.error('Error fetching candidate by ID:', error);
    return null;
  }
}

interface CampaignData {
  id: string; 
  candidateRecordIds: string[]; 
}

export async function fetchActiveCampaignByAccessCode(accessCode: string): Promise<CampaignData | null> {
  if (!process.env.AIRTABLE_CAMPAIGNS_TABLE_ID) {
    console.error('AIRTABLE_CAMPAIGNS_TABLE_ID is not set.');
    throw new Error('Server configuration error: Campaigns table ID missing.');
  }
  try {
    const records = await campaignsTable.select({
      filterByFormula: `AND({Access Code} = "${accessCode}", {Status} = "Active")`,
      maxRecords: 1
    }).firstPage();

    if (records.length > 0) {
      const campaignRecord = records[0];
      const candidateIds = campaignRecord.fields['Candidates for this campaign'] as string[] | undefined;
      return {
        id: campaignRecord.id,
        candidateRecordIds: candidateIds || []
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching campaign by access code:', error);
    throw new Error('Failed to fetch campaign data');
  }
}

export async function fetchCandidatesByIds(recordIds: string[]): Promise<Candidate[]> {
  if (!process.env.AIRTABLE_CANDIDATES_TABLE_ID && !process.env.AIRTABLE_TABLE_ID) {
    console.error('AIRTABLE_CANDIDATES_TABLE_ID or AIRTABLE_TABLE_ID is not set.');
    throw new Error('Server configuration error: Candidates table ID missing.');
  }
  if (!recordIds || recordIds.length === 0) {
    return [];
  }
  const filterFormula = "OR(" + recordIds.map(id => `RECORD_ID()='${id}'`).join(',') + ")";
  try {
    const records = await candidatesTable.select({
      filterByFormula: filterFormula
    }).all();
    return records.map(mapAirtableToCandidate);
  } catch (error) {
    console.error('Error fetching candidates by IDs from Airtable:', error);
    throw new Error('Failed to fetch specific candidates');
  }
}

export async function logInterestExpression(candidateId: string, clientData: {
  name: string;
  organization: string;
  email: string;
  phone?: string;
  notes?: string;
}) {
  try {
    const interestTable = base('Interest Expressions'); 
    
    await interestTable.create([
      {
        fields: {
          'Candidate ID': candidateId,
          'Client Name': clientData.name,
          'Organization': clientData.organization,
          'Email': clientData.email,
          'Phone': clientData.phone || '',
          'Notes': clientData.notes || '',
          'Date': new Date().toISOString(),
        },
      },
    ]);
  } catch (error) {
    console.error('Error logging interest expression:', error);
    // Not re-throwing to allow email to send even if Airtable log fails
  }
}
