export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  country: string;
  currency?: string;
  isVerified: boolean;
  profilePicture?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country?: string;
}

export interface OAuthProvider {
  id: 'google' | 'apple' | 'email';
  name: string;
  icon: string;
}