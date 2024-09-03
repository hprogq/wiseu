import express from 'express';
import {
    identityTypesController,        // 获取可绑定的身份类型列表
    identityTypeParamsController,   // 获取特定身份类型的登录参数
    identitiesController,           // 身份控制器
    identityInstanceController,     // 身份实例控制器
    identityAliasController,        // 刷新身份别名
} from '../controllers/identityController';

const router = express.Router();

// 获取可绑定的身份类型列表
router.all('/identities/types/:type/params', identityTypeParamsController);
router.all('/identities/types', identityTypesController);
router.all('/identities/:identityId/alias', identityAliasController);
router.all('/identities/:identityId', identityInstanceController);
router.all('/identities', identitiesController);

export default router;
