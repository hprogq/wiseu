import { Request, Response } from "express";
import Identity from "../models/Identity";
import User from "../models/User";
import DluflUndergradService from "../services/identity/DluflUndergradService";
import { IdentityProvider } from "../providers/IdentityProvider";
import identityRegistry from "../services/identity/identityRegistry";
import restful from "../helpers/restfulHelper";
import { createResponse } from "../utils/responseHelper";
import dotenv from "dotenv";
import md5 from "md5";

dotenv.config();

export const identitiesController = (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      // getBoundIdentitiesList
      get: async (req: Request, res: Response) => {
        try {
          const userId = req.session.user?.id;
          const identities = await Identity.find({ user: userId })
            .select("alias lastUpdated type")
            .lean()
            .exec();

          // 为每个身份增加类型的详细信息（名称、描述、icon等）
          const enrichedIdentities = identities.map((identity) => {
            const IdentityClass = identityRegistry.getIdentity(identity.type);
            const IdentityInstance = new IdentityClass();
            return {
              ...identity,
              typeInfo: {
                name: IdentityInstance.name,
                description: IdentityInstance.description,
                icon: IdentityInstance.icon,
              },
            };
          });

          res.json(
            createResponse(
              true,
              "Bound identities fetched successfully",
              enrichedIdentities,
            ),
          );
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
      // bindIdentity
      post: async (req: Request, res: Response) => {
        try {
          const { type, configuration } = req.body;
          const userId = req.session.user?.id;
          const IdentityClass = identityRegistry.getIdentity(type);
          const IdentityInstance = new IdentityClass();
          const defaultParams = IdentityInstance.params;

          if (!configuration) {
            res
              .status(500)
              .json(
                createResponse(false, "Missing required field: configuration"),
              );
            return;
          }

          // 初始化
          const isValid = IdentityInstance.init(configuration);
          if (!isValid) {
            return res
              .status(400)
              .json(createResponse(false, "Invalid service configuration"));
          }
          for (const param of defaultParams) {
            if (param.required && !configuration[param.fieldName]) {
              res
                .status(500)
                .json(
                  createResponse(
                    false,
                    `Missing required field: ${param.displayName}`,
                  ),
                );
              return;
            }
          }

          // 获取 token
          const token = await IdentityInstance.getTokenByParams(configuration);
          if (!token.success) {
            res
              .status(500)
              .json(
                createResponse(
                  false,
                  token.message || "Identity validation failed",
                ),
              );
            return;
          }
          if (!token.data) {
            res.status(500).json(createResponse(false, "Token missing"));
            return;
          }

          // 使用获取的 token 获取用户信息
          const infoResponse = await IdentityInstance.getInfoByToken(
            token.data,
          );
          if (!infoResponse.success || !infoResponse.data) {
            res
              .status(500)
              .json(
                createResponse(
                  false,
                  infoResponse.message ||
                    "Failed to retrieve identity info, please try again later.",
                ),
              );
            return;
          }

          const uuid = md5(
            infoResponse.extra.uuid || JSON.stringify(configuration),
          );
          const alias = infoResponse.extra.alias || "Unknown";
          // 检查是否已经绑定了相同 type 和 uniqueId 的身份
          const existingIdentity = await Identity.findOne({
            user: userId,
            type: type,
            uuid: uuid,
          });

          if (existingIdentity) {
            res
              .status(400)
              .json(
                createResponse(
                  false,
                  "This identity has been already bound to your account.",
                ),
              );
            return;
          }

          // 创建并保存 identity 信息
          const identity = new Identity({
            user: userId,
            type,
            params: configuration,
            token: token.data,
            alias,
            uuid,
            lastUpdated: new Date(),
          });

          await identity.save();

          // 更新用户的身份列表
          await User.findByIdAndUpdate(userId, {
            $push: { identities: identity._id },
          });

          res.json(
            createResponse(true, "Success", {
              _id: identity._id,
              alias: alias,
              info: infoResponse.data,
              lastUpdated: identity.lastUpdated,
            }),
          );
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
    },
    true,
  );
};

export const identityInstanceController = (req: Request, res: Response) => {
  restful(req, res, {
    // getIdentityInfo
    get: async (req: Request, res: Response) => {
      try {
        const { identityId } = req.params;
        const userId = req.session.user?.id;

        const identity = await Identity.findOne({
          _id: identityId,
          user: userId,
        })
          .select("alias lastUpdated type")
          .lean();
        if (!identity) {
          return res
            .status(404)
            .json(createResponse(false, "Identity not found"));
        }

        // 为身份增加类型的详细信息（名称、描述、icon等）
        const IdentityClass = identityRegistry.getIdentity(identity.type);
        const IdentityInstance = new IdentityClass();
        const enrichedIdentity = {
          ...identity,
          typeInfo: {
            name: IdentityInstance.name,
            description: IdentityInstance.description,
            icon: IdentityInstance.icon,
          },
        };

        res.json(
          createResponse(
            true,
            "Identity details fetched successfully",
            enrichedIdentity,
          ),
        );
      } catch (error: any) {
        res.status(500).json(createResponse(false, error.message));
      }
    },

    // editIdentityInfo
    put: async (req: Request, res: Response) => {
      try {
        const { identityId } = req.params;
        const { configuration } = req.body;
        const userId = req.session.user?.id;

        if (!configuration) {
          res
            .status(400)
            .json(
              createResponse(false, "Missing required field: configuration"),
            );
          return;
        }

        const identity = await Identity.findOne({
          _id: identityId,
          user: userId,
        });
        if (!identity) {
          res.status(404).json(createResponse(false, "Identity not found"));
          return;
        }

        const IdentityClass = identityRegistry.getIdentity(identity.type);
        const IdentityInstance = new IdentityClass();
        const defaultParams = IdentityInstance.params;

        // 验证参数
        for (const param of defaultParams) {
          if (param.required && !configuration[param.fieldName]) {
            res
              .status(400)
              .json(
                createResponse(
                  false,
                  `Missing required field: ${param.displayName}`,
                ),
              );
            return;
          }
        }

        // 获取新的 token
        const token = await IdentityInstance.getTokenByParams(configuration);
        if (!token.success || !token.data) {
          res
            .status(400)
            .json(
              createResponse(
                false,
                token.message || "Identity validation failed",
              ),
            );
          return;
        }

        // 获取新的用户信息
        const infoResponse = await IdentityInstance.getInfoByToken(token.data);
        if (!infoResponse.success || !infoResponse.data) {
          res
            .status(500)
            .json(
              createResponse(
                false,
                infoResponse.message || "Failed to retrieve identity info",
              ),
            );
          return;
        }

        const uuid = md5(
          infoResponse.extra.uuid || JSON.stringify(configuration),
        );
        const alias = infoResponse.extra.alias || "Unknown";

        // 检查是否已有相同 uuid 的身份，但不是当前更新的身份
        const existingIdentity = await Identity.findOne({
          user: userId,
          type: identity.type,
          uuid: uuid,
          _id: { $ne: identityId }, // 确保不是当前更新的身份
        });

        if (existingIdentity) {
          res
            .status(400)
            .json(
              createResponse(
                false,
                "An identity with the same information already exists",
              ),
            );
          return;
        }

        // 更新身份信息
        identity.params = configuration;
        identity.token = token.data;
        identity.alias = alias;
        identity.uuid = uuid;
        identity.lastUpdated = new Date();

        await identity.save();

        res.json(
          createResponse(true, "Identity updated successfully", {
            _id: identity._id,
            alias: alias,
            info: infoResponse.data,
            lastUpdated: identity.lastUpdated,
          }),
        );
      } catch (error: any) {
        res.status(500).json(createResponse(false, error.message));
      }
    },

    // deleteIdentity
    delete: async (req: Request, res: Response) => {
      try {
        const { identityId } = req.params;
        const userId = req.session.user?.id;

        const identity = await Identity.findOneAndDelete({
          _id: identityId,
          user: userId,
        });
        if (!identity) {
          return res
            .status(404)
            .json(createResponse(false, "Identity not found"));
        }

        // 更新用户的身份列表
        await User.findByIdAndUpdate(userId, {
          $pull: { identities: identityId },
        });

        res.json(createResponse(true, "Identity deleted successfully"));
      } catch (error: any) {
        res.status(500).json(createResponse(false, error.message));
      }
    },
  });
};

// 获取可绑定的身份类型列表
export const identityTypesController = (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      // getIdentityTypes
      get: async (req: Request, res: Response) => {
        try {
          const Identities = Object.keys(identityRegistry.registry).map(
            (key) => {
              const IdentityClass = identityRegistry.getIdentity(key);
              const identityInstance = new IdentityClass();
              return {
                type: identityInstance.type,
                name: identityInstance.name,
                description: identityInstance.description,
                icon: identityInstance.icon,
              };
            },
          );
          res.json(
            createResponse(
              true,
              "Available Identities fetched successfully",
              Identities,
            ),
          );
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
    },
    true,
  );
};

// 获取登录参数
export const identityTypeParamsController = (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      // getIdentityTypeParams
      get: async (req: Request, res: Response) => {
        try {
          const { type } = req.params;
          const IdentityClass = identityRegistry.getIdentity(type);
          const IdentityInstance = new IdentityClass();
          const params = IdentityInstance.params;

          res.json(createResponse(true, "Success", params));
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
    },
    true,
  );
};

// 刷新身份别名
export const identityAliasController = async (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      post: async (req: Request, res: Response) => {
        try {
          const { identityId } = req.params;
          const userId = req.session.user?.id;

          const identity = await Identity.findOne({
            _id: identityId,
            user: userId,
          });
          if (!identity) {
            res.status(404).json(createResponse(false, "Identity not found"));
            return;
          }

          const IdentityClass = identityRegistry.getIdentity(identity.type);
          const IdentityInstance = new IdentityClass();
          const infoResponse = await IdentityInstance.getInfoByToken(
            identity.token,
          );
          if (!infoResponse.success || !infoResponse.data) {
            res
              .status(500)
              .json(
                createResponse(
                  false,
                  infoResponse.message || "Failed to retrieve identity info",
                ),
              );
            return;
          }

          const alias = infoResponse.extra.alias || "Unknown";
          identity.alias = alias;
          identity.lastUpdated = new Date();
          await identity.save();

          res.json(
            createResponse(true, "Alias refreshed successfully", {
              alias,
              lastUpdated: identity.lastUpdated,
            }),
          );
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
    },
    true,
  );
};

// 用于服务调用的身份验证和授权函数
export const authorizeIdentity = async (
  identityId: string,
  service: any,
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
}> => {
  try {
    const identity = await Identity.findById(identityId);
    if (!identity) {
      return { success: false, message: "Identity not found" };
    }

    const IdentityClass = identityRegistry.getIdentity(identity.type);
    const IdentityInstance = new IdentityClass();

    // 验证 token
    const validationResult = await IdentityInstance.validateToken(
      identity.token,
    );
    if (!validationResult.success) {
      // Token 无效，尝试刷新
      const refreshResult = await IdentityInstance.getTokenByParams(
        identity.params,
      );
      if (!refreshResult.success || !refreshResult.data) {
        return { success: false, message: "Failed to refresh token" };
      }

      // 更新数据库中的 token
      identity.token = refreshResult.data;
      identity.lastUpdated = new Date();
      await identity.save();
    }

    // 使用有效的 token 进行服务授权
    const authResult = await IdentityInstance.authorizeServiceByToken(
      identity.token,
      service,
    );
    if (!authResult.success) {
      return { success: false, message: "Service authorization failed" };
    }

    return { success: true, data: authResult.data };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
