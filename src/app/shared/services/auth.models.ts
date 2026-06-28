export interface LoginRequestDto {
  Email: string;
  MotDePasse: string;
}

export interface TokenApiDto {
  AccessToken?: string;
  RefreshToken?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface UserResponseDto {
  UserId?: string;
  Nom?: string;
  Prenom?: string;
  Email?: string;
  Telephone?: string;
  Role?: string;
  Filiale?: string;
  userId?: string;
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  role?: string;
  Filiale?: string;
  filiale?: string;
  PhotoUrl?: string;
  photoUrl?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  userId: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: string;
  filiale: string;
  photoUrl?: string;
}
