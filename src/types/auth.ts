export interface AuthUser {
  username: string;
  fullName: string;
  roles: string[];
  profilePictureUrl?: string;
  associatedId?: number;
  requirePasswordChange: boolean;
}

export interface LoginResponse {
  token: string;
  username: string;
  fullName: string;
  roles: string[];
  profilePictureUrl?: string;
  associatedId?: number;
  requirePasswordChange: boolean;
}