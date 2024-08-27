import { Request } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import config from '../config/config';
import { translate } from '../utils/translate';

/**
 * @description Registers a new user. Throws an error if the user already exists.
 * @param req - Express Request object
 * @param username - The username of the new user
 * @param email - The email of the new user
 * @param password - The plain text password of the new user
 * @returns The newly created user
 */
export async function registerUser(req: Request, username: string, email: string, password: string): Promise<IUser | null> {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        throw new Error(translate(req, 'auth.user_exists'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    return newUser;
}

/**
 * @description Logs in a user using email/username and password. Throws an error if the user is not found or if the password is incorrect.
 * @param req - Express Request object
 * @param emailOrUsername - The email or username of the user
 * @param password - The plain text password of the user
 * @returns A JWT token
 */
export async function loginUser(req: Request, emailOrUsername: string, password: string): Promise<string | null> {
    const user = await User.findOne({ $or: [{ email: emailOrUsername }, { username: emailOrUsername }] });
    if (!user) {
        throw new Error(translate(req, 'auth.user_not_found'));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error(translate(req, 'auth.password_incorrect'));
    }

    const token = jwt.sign(
        { user_id: user._id, username: user.username, roles: user.roles },
        config.jwtSecret,
        { expiresIn: '1h' }
    );

    return token;
}
