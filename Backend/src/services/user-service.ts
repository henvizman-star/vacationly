import type { ResultSetHeader } from "mysql2";
import { ClientError } from "../models/client-error";
import { HttpStatus, Role } from "../models/enums";
import type { CredentialsModel, RegistrationModel, StoredUserModel, UserModel } from "../models/user-model";
import { cyber } from "../utils/cyber";
import { dal, type Database } from "../utils/dal";

export class UserService {
    // Accepts a database dependency so tests can exercise the service in isolation.
    public constructor(private readonly database: Database = dal) {}

    // Hashes and saves a new user's password, then returns a token.
    // Rejects an email already registered in MySQL.
    public async register(user: RegistrationModel): Promise<string> {
        const passwordHash = await cyber.hashPassword(user.password);
        try {
            const info = await this.database.execute<ResultSetHeader>(
                "INSERT INTO users (firstName, lastName, email, passwordHash, roleId) VALUES (?, ?, ?, ?, ?)",
                [user.firstName, user.lastName, user.email, passwordHash, Role.User]
            );
            return cyber.generateToken({
                id: info.insertId, firstName: user.firstName, lastName: user.lastName,
                email: user.email, roleId: Role.User
            });
        } catch (error) {
            // The UNIQUE constraint handles concurrent attempts with the same email.
            if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
                throw new ClientError(HttpStatus.Conflict, "This email is already registered.");
            }
            throw error;
        }
    }

    // Finds an account by email, verifies its password, and returns a token.
    public async login(credentials: CredentialsModel): Promise<string> {
        const users = await this.database.execute<StoredUserModel[]>(
            "SELECT id, firstName, lastName, email, passwordHash, roleId FROM users WHERE email = ?",
            [credentials.email]
        );
        const user = users[0];
        if (!user || !await cyber.verifyPassword(credentials.password, user.passwordHash)) {
            throw new ClientError(HttpStatus.Unauthorized, "Incorrect email or password.");
        }
        return cyber.generateToken(user);
    }

    // Returns current public account details or rejects a deleted account.
    public async getOne(id: number): Promise<UserModel> {
        const users = await this.database.execute<UserModel[]>(
            "SELECT id, firstName, lastName, email, roleId FROM users WHERE id = ?", [id]
        );
        if (!users[0]) throw new ClientError(HttpStatus.Unauthorized, "Your account is no longer available.");
        return users[0];
    }
}
export const userService = new UserService();
