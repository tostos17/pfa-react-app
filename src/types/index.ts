// Core User details
export interface User {
  id: number;
  username: string;
  enabled: boolean;
  requirePasswordChange: boolean;
}

// Player Profile Demographics
export interface PlayerData {
  userId: number;
  playerId: string; // Business UUID
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth: string; // ISO Date String
  passportUrl?: string; // S3 Bucket address pointer
  healthy: boolean;
  healthConcerns?: string;
  parentId?: number;
}

// Financial Ledger details
export interface Account {
  playerId: number;
  accountId: string;
  status: boolean;
  currentPending: number;
  outstandings: number;
}


// Matches SessionResponseDto
export interface SessionDto {
  id: number;
  name: string;
  startDate: string; // LocalDate translates to ISO string format (YYYY-MM-DD)
  endDate: string;
  isActive: boolean;
  activitiesDescription: string | null;
  terms: TermDto[];
}

// Matches your custom generic ApiResponse<T> wrapper
export interface ApiResponse<T> {
  code: number;
  success: boolean;
  message: string;
  body: T; // This will hold our array of SessionDto
}

export interface TermDto {
  id: number;
  name: string;
  startDate: string; 
  endDate: string;   
  isCurrentActive: boolean; 
}