export interface Candidate {
  id: string; // This is the Airtable internal record ID (e.g., recXXXXXXXXXXXXXX)
  gpCustomId?: string; // For your custom "GP Record ID" field
  areaOfInterest: string[];
  experienceYears: number;
  experienceSummary: string;
  detailedExperience: string;
  availability: {
    sessionsPerWeek: {
      min: number;
      max: number;
    };
    startDate: string;
    details: string;
  };
  profileSummary: string;
  imcRegistration: boolean;
  division: 'specialist' | 'general';
  languages: string[];
  salaryExpectations: {
    min: number;
    max: number;
    currency: string;
    period: string; // More flexible to accommodate "Session/year", "Annual", "per Session"
  };
  gmsInterest: string; // More flexible for values like "Yes", "No", "Later stage..."
}

export interface ClientForm {
  name: string;
  organization: string;
  email: string;
  phone?: string;
  notes?: string;
}

export interface FilterState {
  availability: string[];
  medicalInterest: string[];
  division: string[];
  gmsInterest: string[];
  search: string;
}
