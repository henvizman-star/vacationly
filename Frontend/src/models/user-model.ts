import { Role } from "./enums";
export type UserModel = { id: number; firstName: string; lastName: string; email: string; roleId: Role };
export type CredentialsModel = { email: string; password: string };
export type RegistrationModel = CredentialsModel & { firstName: string; lastName: string };
