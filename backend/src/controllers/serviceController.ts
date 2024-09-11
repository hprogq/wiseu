import { Request, Response } from "express";
import ServiceRegistry from "../services/service/serviceRegistry";
import { isConfiguration } from "../providers/CommonProvider";
import { createResponse } from "../utils/responseHelper";
import User from "../models/User";
import Service from "../models/Service";
import restful from "../helpers/restfulHelper";
import mongoose from "mongoose";
import Identity from "../models/Identity";
import service from "../models/Service";
import {
  addServiceTask,
  removeServiceTask,
} from "../services/service/serviceScheduler"; // 引入定时任务取消方法

// 获取所有可用服务
export const getAllServices = (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      get: async (req: Request, res: Response) => {
        try {
          const services = Object.keys(ServiceRegistry.registry).map((key) => {
            const ServiceClass = ServiceRegistry.getService(key);
            const serviceInstance = new ServiceClass();
            return {
              type: serviceInstance.type,
              name: serviceInstance.name,
              description: serviceInstance.description,
              icon: serviceInstance.icon,
              category: serviceInstance.category,
              identityType: serviceInstance.identityType,
            };
          });
          res.json(
            createResponse(
              true,
              "Available services fetched successfully",
              services,
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

// 服务管理
export const userServicesController = (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      get: async (req: Request, res: Response) => {
        try {
          const userId = req.session.user?.id;
          const services = await Service.find({ user: userId });

          res.json(
            createResponse(
              true,
              "User services fetched successfully",
              services,
            ),
          );
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },

      post: async (req: Request, res: Response) => {
        try {
          const userId = req.session.user?.id;
          const { type, identityId, configuration } = req.body;

          if (
            !type ||
            !identityId ||
            !configuration ||
            !isConfiguration(configuration)
          ) {
            return res
              .status(400)
              .json(createResponse(false, "Invalid request body"));
          }

          const ServiceClass = ServiceRegistry.getService(type);
          const serviceInstance = new ServiceClass();

          // 验证身份类型
          if (!mongoose.Types.ObjectId.isValid(identityId)) {
            return res
              .status(400)
              .json(createResponse(false, "Invalid identity ID"));
          }
          const identity = await Identity.findOne({
            _id: new mongoose.Types.ObjectId(identityId),
            user: new mongoose.Types.ObjectId(userId),
          });
          if (!identity) {
            return res
              .status(404)
              .json(createResponse(false, "Identity not found"));
          }
          if (!serviceInstance.identityType.includes(identity.type)) {
            return res
              .status(400)
              .json(
                createResponse(false, "Invalid identity type for this service"),
              );
          }

          // 检查服务是否已存在
          const existingService = await Service.findOne({
            user: userId,
            type,
            identityId: new mongoose.Types.ObjectId(identityId),
          });
          if (existingService) {
            return res
              .status(400)
              .json(createResponse(false, "Service already exists"));
          }

          const isValid = await serviceInstance.init(identityId, configuration);
          if (!isValid) {
            return res
              .status(400)
              .json(createResponse(false, "Invalid service configuration"));
          }

          const newService = new Service({
            user: userId,
            type,
            identityId: identityId,
            category: serviceInstance.category,
            configuration: configuration,
            createdAt: new Date(),
            status: "UP",
          });

          await newService.save();

          await serviceInstance.update();

          // 获取服务的执行间隔
          const interval = serviceInstance.interval; // 转换为毫秒

          // 添加服务任务
          if (interval > 0) {
            await addServiceTask(newService.id, interval);
          }

          res.json(
            createResponse(true, "Service added successfully", {
              id: newService.id,
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

// 删除用户的服务
export const deleteService = (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      delete: async (req: Request, res: Response) => {
        try {
          const { serviceId } = req.params;
          const userId = req.session.user?.id;

          const service = await Service.findOneAndDelete({
            _id: serviceId,
            user: userId,
          });
          if (!service) {
            return res
              .status(404)
              .json(createResponse(false, "Service not found"));
          }

          // 取消该服务的定时任务
          await removeServiceTask(serviceId);

          res.json(createResponse(true, "Service deleted successfully"));
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
    },
    true,
  );
};

// 更新用户服务配置
export const updateServiceConfiguration = (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      put: async (req: Request, res: Response) => {
        try {
          const { serviceId } = req.params;
          const { config, identityId, configuration, status } = req.body;
          const userId = req.session.user?.id;

          const service = await Service.findOne({
            _id: serviceId,
            user: userId,
          });
          if (!service) {
            return res
              .status(404)
              .json(createResponse(false, "Service not found"));
          }

          const ServiceClass = ServiceRegistry.getService(service.type);
          const serviceInstance = new ServiceClass();

          // 验证身份类型
          if (!mongoose.Types.ObjectId.isValid(identityId)) {
            return res
              .status(400)
              .json(createResponse(false, "Invalid identity ID"));
          }
          const identity = await Identity.findOne({
            _id: new mongoose.Types.ObjectId(identityId),
            user: new mongoose.Types.ObjectId(userId),
          });
          if (!identity) {
            return res
              .status(404)
              .json(createResponse(false, "Identity not found"));
          }
          if (!serviceInstance.identityType.includes(identity.type)) {
            return res
              .status(400)
              .json(
                createResponse(false, "Invalid service type for this service"),
              );
          }

          // 检查服务是否已存在
          const existingService = await Service.findOne({
            user: userId,
            type: service.type,
            identityId: new mongoose.Types.ObjectId(identityId),
            _id: { $ne: serviceId },
          });
          if (existingService) {
            return res
              .status(400)
              .json(createResponse(false, "Service already exists"));
          }

          const isValid = await serviceInstance.init(identityId, configuration);
          if (!isValid) {
            return res
              .status(400)
              .json(createResponse(false, "Invalid service configuration"));
          }

          service.configuration = config;
          await service.save();

          res.json(
            createResponse(
              true,
              "Service configuration updated successfully",
              service,
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

// 验证服务配置的有效性
export const validateServiceConfiguration = (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      get: async (req: Request, res: Response) => {
        try {
          const { serviceId } = req.params;
          const userId = req.session.user?.id;

          const service = await Service.findOne({
            _id: serviceId,
            user: userId,
          }).populate("identity");
          if (!service) {
            return res
              .status(404)
              .json(createResponse(false, "Service not found"));
          }

          const ServiceClass = ServiceRegistry.getService(service.type);
          const serviceInstance = new ServiceClass();

          const isValid = await serviceInstance.init(
            service.identityId,
            service.configuration,
          );
          if (!isValid) {
            return res
              .status(400)
              .json(createResponse(false, "Invalid service configuration"));
          }

          res.json(createResponse(true, "Service configuration is valid"));
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
    },
    true,
  );
};

// 启用用户服务
export const enableService = async (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      post: async (req: Request, res: Response) => {
        try {
          const { serviceId } = req.params;
          const userId = req.session.user?.id;

          const service = await Service.findOne({
            _id: serviceId,
            user: userId,
          });
          if (!service) {
            return res
              .status(404)
              .json(createResponse(false, "Service not found"));
          }

          if (service.status === "UP") {
            return res
              .status(400)
              .json(createResponse(false, "Service is already enabled"));
          }

          // 启用服务并更新状态
          service.status = "UP";
          service.lastUpdated = new Date(); // 更新lastUpdated
          await service.save();

          // 获取服务的执行间隔
          const ServiceClass = ServiceRegistry.getService(service.type);
          const serviceInstance = new ServiceClass();
          const interval = serviceInstance.interval; // 转换为毫秒

          if (interval > 0) {
            await serviceInstance.update();

            // 添加到消息队列
            await addServiceTask(service.id, interval);
          }

          res.json(createResponse(true, "Service enabled successfully"));
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
    },
    true,
  );
};

// 禁用用户服务
export const disableService = async (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      post: async (req: Request, res: Response) => {
        try {
          const { serviceId } = req.params;
          const userId = req.session.user?.id;

          const service = await Service.findOne({
            _id: serviceId,
            user: userId,
          });
          if (!service) {
            return res
              .status(404)
              .json(createResponse(false, "Service not found"));
          }

          if (service.status === "DISABLED") {
            return res
              .status(400)
              .json(createResponse(false, "Service is already disabled"));
          }

          // 禁用服务并更新状态
          service.status = "DISABLED";
          service.lastUpdated = new Date(); // 更新lastUpdated
          await service.save();

          // 从消息队列中移除
          await removeServiceTask(service.id);

          res.json(createResponse(true, "Service disabled successfully"));
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
    },
    true,
  );
};

// 获取服务的详细信息
export const getServiceDetails = (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      get: async (req: Request, res: Response) => {
        try {
          const { serviceId } = req.params;
          const userId = req.session.user?.id;

          const service = await Service.findOne({
            _id: serviceId,
            user: userId,
          });
          if (!service) {
            return res
              .status(404)
              .json(createResponse(false, "Service not found"));
          }

          res.json(
            createResponse(
              true,
              "Service details fetched successfully",
              service,
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

// 刷新服务
export const refreshService = (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      post: async (req: Request, res: Response) => {
        try {
          const { serviceId } = req.params;
          const userId = req.session.user?.id;

          const service = await Service.findOne({
            _id: serviceId,
            user: userId,
          });
          if (!service) {
            return res
              .status(404)
              .json(createResponse(false, "Service not found"));
          }

          const ServiceClass = ServiceRegistry.getService(service.type);
          const serviceInstance = new ServiceClass();

          // 更新 lastUpdated 字段
          service.lastUpdated = new Date();
          await service.save();

          // 立即执行更新操作
          await serviceInstance.init(
            service.identityId,
            service.configuration,
            serviceId,
          );
          await serviceInstance.update();

          // 刷新任务队列中的下一次执行时间
          const interval = serviceInstance.interval; // 转换为毫秒
          if (interval > 0) {
            await addServiceTask(serviceId, interval);
            res.json(
              createResponse(
                true,
                "Service refreshed and next execution scheduled.",
              ),
            );
          } else {
            res.json(
              createResponse(
                true,
                "Service refreshed but no scheduling needed due to interval <= 0.",
              ),
            );
          }
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
    },
    true,
  );
};

// 清除运行时数据
export const clearServiceRuntimeData = async (req: Request, res: Response) => {
  restful(
    req,
    res,
    {
      delete: async (req: Request, res: Response) => {
        try {
          const { serviceId } = req.params;
          const userId = req.session.user?.id;

          const service = await Service.findOne({
            _id: serviceId,
            user: userId,
          });
          if (!service) {
            return res
              .status(404)
              .json(createResponse(false, "Service not found"));
          }

          service.runtime = {};
          service.lastUpdated = new Date();
          await service.save();

          // 获取服务的执行间隔
          const ServiceClass = ServiceRegistry.getService(service.type);
          const serviceInstance = new ServiceClass();
          const interval = serviceInstance.interval; // 转换为毫秒

          if (interval > 0) {
            await serviceInstance.update();

            // 添加到消息队列
            await addServiceTask(service.id, interval);
          }

          res.json(createResponse(true, "Runtime Data cleared successfully"));
        } catch (error: any) {
          res.status(500).json(createResponse(false, error.message));
        }
      },
    },
    true,
  );
};

// 获取某服务的运行时数据，用于给该服务调用
export const getServiceRuntimeData = async (serviceId: string) => {
  try {
    const service = await Service.findOne({ _id: serviceId });
    if (!service) {
      return { success: false, message: "Service not found" };
    }

    return { success: true, data: service.runtime };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

// 设置某服务的运行时数据
export const setServiceRuntimeData = async (serviceId: string, data: any) => {
  try {
    const service = await Service.findOne({ _id: serviceId });
    if (!service) {
      return { success: false, message: "Service not found" };
    }

    service.runtime = data;
    service.markModified("runtime");
    await service.save();

    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
