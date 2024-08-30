import express from 'express';
import { bindIdentity, getLoginParameters } from '../controllers/identityController';

const router = express.Router();

router.all('/bind', bindIdentity);
router.all('/parameters/:type', getLoginParameters); // 新增获取登录参数的接口

export default router;