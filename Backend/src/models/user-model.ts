import { z } from "zod";
import { Role } from "./enums";

// Validates the email and password used for sign-in.
export const credentialsSchema = z.object({
    email: z.email("Enter a valid email address.").max(100).transform(value => value.toLowerCase()),
    password: z.string().min(4, "Password must contain at least 4 characters.").max(100)
});

// Adds the required first and last names for registration.
export const registrationSchema = credentialsSchema.extend({
    firstName: z.string().trim().min(1, "First name is required.").max(50),
    lastName: z.string().trim().min(1, "Last name is required.").max(50)
});
export type CredentialsModel = z.infer<typeof credentialsSchema>;
export type RegistrationModel = z.infer<typeof registrationSchema>;

// Public user details returned by the API; excludes the password hash.
export type UserModel = {
    id: number; firstName: string; lastName: string; email: string; roleId: Role;
};

// Database user details, including the hash needed to verify a password.
export type StoredUserModel = UserModel & { passwordHash: string };

