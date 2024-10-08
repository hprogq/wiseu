import { Request, Response } from "express";
import {
  registerUser,
  loginUser,
  getUserInfo,
} from "../services/auth/authService";
import { check, validationResult } from "express-validator";
import { translate } from "../utils/translate";
import { createResponse } from "../utils/responseHelper";
import restful from "../helpers/restfulHelper";

// 处理用户信息输出格式，仅返回部分信息
function formatUserResponse(user: any) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
  };
}

export async function register(req: Request, res: Response) {
  restful(req, res, {
    post: async (req: Request, res: Response) => {
      await check("username")
        .trim()
        .notEmpty()
        .withMessage(translate(req, "validation.username_required"))
        .isLength({ min: 3 })
        .withMessage(translate(req, "validation.username_length"))
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage(translate(req, "validation.username_format"))
        .run(req);

      await check("email")
        .trim()
        .isEmail()
        .withMessage(translate(req, "validation.email_invalid"))
        .run(req);

      await check("password")
        .isLength({ min: 8, max: 16 })
        .withMessage(translate(req, "validation.password_length"))
        .matches(/[A-Z]/)
        .withMessage(translate(req, "validation.password_uppercase"))
        .matches(/[a-z]/)
        .withMessage(translate(req, "validation.password_lowercase"))
        .matches(/[0-9]/)
        .withMessage(translate(req, "validation.password_digit"))
        .matches(/[\W_]/)
        .withMessage(translate(req, "validation.password_special"))
        .run(req);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json(createResponse(false, firstError.msg));
      }

      try {
        const { username, email, password } = req.body;
        const user = await registerUser(req, username, email, password);

        await loginUser(req, email, password);
        return res.status(201).json(
          createResponse(true, translate(req, "auth.register_success"), {
            user: formatUserResponse(user),
          }),
        );
      } catch (error: any) {
        return res.status(400).json(createResponse(false, error.message));
      }
    },
  });
}

export async function session(req: Request, res: Response) {
  restful(req, res, {
    post: async (req: Request, res: Response) => {
      const { username, password } = req.body;
      if (!username || !password) {
        return res
          .status(400)
          .json(
            createResponse(
              false,
              translate(req, "validation.username_password_required"),
            ),
          );
      }
      const isEmail = username.includes("@");

      if (isEmail) {
        await check("username")
          .trim()
          .isEmail()
          .withMessage(translate(req, "validation.email_invalid"))
          .run(req);
      } else {
        await check("username")
          .trim()
          .notEmpty()
          .withMessage(translate(req, "validation.username_required"))
          .isLength({ min: 3 })
          .withMessage(translate(req, "validation.username_length"))
          .matches(/^[a-zA-Z0-9_]+$/)
          .withMessage(translate(req, "validation.username_format"))
          .run(req);
      }

      await check("password")
        .notEmpty()
        .withMessage(translate(req, "validation.password_required"))
        .run(req);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return res.status(400).json(createResponse(false, firstError.msg));
      }

      try {
        const user = await loginUser(req, username, password);
        return res.status(200).json(
          createResponse(true, translate(req, "auth.login_success"), {
            user: formatUserResponse(user),
          }),
        );
      } catch (error: any) {
        return res.status(400).json(createResponse(false, error.message));
      }
    },
    delete: async (req: Request, res: Response) => {
      req.session.destroy(function () {
        return res
          .status(200)
          .json(createResponse(true, translate(req, "auth.logout_success")));
      });
    },
  });
}

export async function getCurrentUser(req: Request, res: Response) {
  restful(
    req,
    res,
    {
      get: async (req: Request, res: Response) => {
        const userId = req.session.user?.id; // 假设用户会话存储在 req.session.user 中

        if (!userId) {
          // 用户未登录，返回 401 Unauthorized
          return res
            .status(401)
            .json(createResponse(false, translate(req, "auth.unauthorized")));
        }

        // 返回当前登录用户信息
        const user = await getUserInfo(req, userId);
        return res.status(200).json(
          createResponse(true, translate(req, "auth.current_user"), {
            user: formatUserResponse(user),
          }),
        );
      },
    },
    true,
  );
}
