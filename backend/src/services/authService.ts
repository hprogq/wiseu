import { Request } from 'express';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import { translate } from '../utils/translate';

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

export async function loginUser(req: Request, emailOrUsername: string, password: string): Promise<IUser | null> {
    const user = await User.findOne({ $or: [{ email: emailOrUsername }, { username: emailOrUsername }] });
    if (!user) {
        throw new Error(translate(req, 'auth.user_not_found'));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error(translate(req, 'auth.password_incorrect'));
    }

    req.session.user = { id: user._id };

    return user;
}
