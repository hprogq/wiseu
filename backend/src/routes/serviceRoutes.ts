import express from "express";
import {
  getAllServices, // 获取所有可用服务
  userServicesController, // 获取特定用户启用的服务列表
  disableService, // 禁用用户服务
  enableService, // 启用用户服务
  refreshService, // 刷新用户服务
  clearServiceRuntimeData, // 清除用户服务运行时数据
  getServiceParams, // 获取用户服务配置
  getServiceDetails, // 获取用户服务详情
} from "../controllers/serviceController";

const router = express.Router();

// 路由配置
router.all("/services", userServicesController); // 获取特定用户启用的服务列表
router.all("/services/types", getAllServices); // 获取所有可用服务
router.all("/services/types/:serviceType/params", getServiceParams); // 获取用户服务配置
router.all("/services/:serviceId", getServiceDetails); // 获取用户服务详情
router.all("/services/:serviceId/enable", enableService); // 启用用户服务
router.all("/services/:serviceId/disable", disableService); // 禁用用户服务
router.all("/services/:serviceId/refresh", refreshService); // 禁用用户服务
router.all("/services/:serviceId/runtime", clearServiceRuntimeData); // 清除用户服务运行时数据

export default router;
