import { Request, Response } from 'express';
import { registerUser, loginUser } from '../services/authService';
import { check, validationResult } from 'express-validator';
import { translate } from '../utils/translate';
import { createResponse } from "../utils/responseHelper";
import restful from './helper';

/**
 * @description Handles user registration. Validates input fields such as username, email, and password.
 * After successful registration, automatically logs the user in and returns a JWT token.
 * @route POST /api/auth/register
 * @param req - Express Request object
 * @param res - Express Response object
 * @returns A success message and a JWT token or an error message if validation fails.
 */
export async function register(req: Request, res: Response) {
    restful(req, res, {
        post: async (req: Request, res: Response) => {
            // Validate input data
            await check('username')
                .trim()
                .notEmpty().withMessage(translate(req, 'validation.username_required'))
                .isLength({ min: 3 }).withMessage(translate(req, 'validation.username_length'))
                .matches(/^[a-zA-Z0-9_]+$/).withMessage(translate(req, 'validation.username_format'))
                .run(req);
            await check('email')
                .trim()
                .isEmail().withMessage(translate(req, 'validation.email_invalid'))
                .run(req);
            await check('password')
                .isLength({ min: 8, max: 16 }).withMessage(translate(req, 'validation.password_length'))
                .matches(/[A-Z]/).withMessage(translate(req, 'validation.password_uppercase'))
                .matches(/[a-z]/).withMessage(translate(req, 'validation.password_lowercase'))
                .matches(/[0-9]/).withMessage(translate(req, 'validation.password_digit'))
                .matches(/[\W_]/).withMessage(translate(req, 'validation.password_special'))
                .run(req);

            // Capture validation errors and return the first one
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const firstError = errors.array()[0];
                return res.status(400).json(createResponse(false, firstError.msg));
            }

            try {
                const { username, email, password } = req.body;
                const user = await registerUser(req, username, email, password);

                // Automatically log the user in after registration
                const token = await loginUser(req, email, password);

                return res.status(201).json(createResponse(true, translate(req, 'auth.register_success'), { token }));
            } catch (error: any) {
                return res.status(400).json(createResponse(false, error.message));
            }
        }
    });
}

/**
 * @description Handles user login. Validates username/email and password fields.
 * @route POST /api/auth/login
 * @param req - Express Request object
 * @param res - Express Response object
 * @returns A success message and a JWT token or an error message if validation fails.
 */
export async function login(req: Request, res: Response) {
    restful(req, res, {
        post: async (req: Request, res: Response) => {
            const { username, password } = req.body;

            // Determine if the input is an email or a username
            const isEmail = username.includes('@');

            if (isEmail) {
                // Validate email format
                await check('username')
                    .trim()
                    .isEmail().withMessage(translate(req, 'validation.email_invalid'))
                    .run(req);
            } else {
                // Validate username format
                await check('username')
                    .trim()
                    .notEmpty().withMessage(translate(req, 'validation.username_required'))
                    .isLength({ min: 3 }).withMessage(translate(req, 'validation.username_length'))
                    .matches(/^[a-zA-Z0-9_]+$/).withMessage(translate(req, 'validation.username_format'))
                    .run(req);
            }

            // Validate password field
            await check('password')
                .notEmpty().withMessage(translate(req, 'validation.password_required'))
                .run(req);

            // Capture validation errors and return the first one
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const firstError = errors.array()[0];
                return res.status(400).json(createResponse(false, firstError.msg));
            }

            try {
                // Call the loginUser service with the validated emailOrUsername
                const token = await loginUser(req, username, password);
                return res.status(200).json(createResponse(true, translate(req, 'auth.login_success'), { token }));
            } catch (error: any) {
                return res.status(400).json(createResponse(false, error.message));
            }
        }
    });
}
