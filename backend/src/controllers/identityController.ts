// identityController.ts
import { Request, Response } from 'express';
import Identity from '../models/Identity';
import User from '../models/User';
import DluflUndergradProvider from '../providers/DluflUndergradProvider';
import { IdentityProvider } from '../providers/IdentityProvider';
import restful from "./helper";
import { createResponse } from "../utils/responseHelper";
import { Types } from "mongoose";
import dotenv from 'dotenv';

dotenv.config();

const getProvider = (type: string): IdentityProvider => {
    switch (type) {
        case 'dlufl_undergrad':
            return new DluflUndergradProvider();
        default:
            throw new Error('Unknown identity type');
    }
};

// 绑定身份
export const bindIdentity = async (req: Request, res: Response) => {
    restful(req, res, {
        post: async (req: Request, res: Response) => {
            try {
                const { type, loginInfo } = req.body;
                const userId = req.user?.user_id;

                const provider = getProvider(type);

                // 获取 token
                const validation = await provider.getToken(loginInfo);

                if (!validation.success) {
                    res.status(500).json(createResponse(false, validation.message || 'Identity validation failed'));
                    return;
                }

                // 创建并保存 identity 信息
                const identity = new Identity({
                    user: userId,
                    type,
                    loginInfo: loginInfo,
                    token: validation.token,
                    lastUpdated: new Date()
                });

                await identity.save();

                // 更新用户的身份列表
                await User.findByIdAndUpdate(userId, { $push: { identities: identity._id } });

                const identityId = identity._id as Types.ObjectId;
                // 使用保存后的 identity ID 获取用户信息
                const userInfoResponse = await provider.getUserInfo(identityId.toString());

                let userInfo = {};
                if (userInfoResponse.success) {
                    // 获取用户信息成功，更新 identity 信息
                    await Identity.findByIdAndUpdate(identity._id, { $set: { userInfo: userInfoResponse.data } });
                    userInfo = userInfoResponse.data;
                }

                res.json(createResponse(true, 'Identity bound successfully', { _id: identity._id, userInfo: userInfo }));
            } catch (error: any) {
                res.status(500).json(createResponse(false, error.message));
            }
        }
    }, true);
};

// 获取登录参数
export const getLoginParameters = (req: Request, res: Response) => {
    restful(req, res, {
        get: async (req: Request, res: Response) => {
            try {
                const { type } = req.params;
                const provider = getProvider(type);
                const loginParameters = provider.getLoginParameters();

                res.json(createResponse(true, 'Login parameters fetched successfully', { params: loginParameters }));
            } catch (error: any) {
                res.status(500).json(createResponse(false, error.message));
            }
        }
    }, true);
};