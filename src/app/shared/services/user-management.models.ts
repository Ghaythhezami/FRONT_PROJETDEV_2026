export interface RegisterUserDto {
  Nom: string;
  Prenom: string;
  Email: string;
  MotDePasse: string;
  Telephone?: string;
  Role: string;
  Filiale?: string;
}

export interface UpdateUserDto {
  UserId: string;
  Nom: string;
  Prenom: string;
  Email: string;
  MotDePasse?: string;
  Telephone?: string;
  Role: string;
  Filiale?: string;
}
