import { bullMQRedis } from "../../config/redis";
import { Queue, Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import Service from '../../models/Service';
import ServiceRegistry from '../../services/service/serviceRegistry';
import { printInfo, printError, printWarning } from "../../utils/console";

// 创建队列
const serviceQueue = new Queue('serviceQueue', {
    connection: bullMQRedis,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        removeOnComplete: true, // 成功后自动移除
        removeOnFail: false // 保留失败的任务
    }
});

// 任务处理器
const worker = new Worker('serviceQueue', async (job: Job) => {
    const { serviceId } = job.data;

    // 获取服务数据
    const service = await Service.findById(serviceId);
    if (!service) {
        throw new Error(`Service ${serviceId} not found`);
    }

    // 获取对应的 Service 类
    const ServiceClass = ServiceRegistry.getService(service.type);
    const serviceInstance = new ServiceClass();

    // 执行服务的更新操作
    await serviceInstance.init(service.identityId, service.configuration, serviceId);
    await serviceInstance.update();

    // 更新服务的 lastUpdated 字段
    service.lastUpdated = new Date();
    await service.save();

    // 重新添加下一次执行的定时任务
    const interval = serviceInstance.interval || 10 * 1000; // 默认为 60s
    await addServiceTask(serviceId, interval);
}, { connection: bullMQRedis });

// 监听失败任务
worker.on('failed', async (job, err) => {
    console.error(`Job ${job?.id} failed with error: ${err.message}`);

    if (job) {
        // 获取服务并将状态设置为 `failed`
        const { serviceId } = job.data;
        const service = await Service.findById(serviceId);
        if (service) {
            service.status = 'FAILED';  // 更新状态
            service.failureReason = `${Date.now()} - ${err.message}`;  // 记录失败原因
            await service.save();
        }
    }
});

// 添加定时任务
export async function addServiceTask(serviceId: string, interval: number) {
    // 计算下次执行时间
    const nextExecutionTime = Date.now() + interval;

    // 将任务添加到队列，使用 `delay` 设置延时任务
    await serviceQueue.add('updateService', { serviceId }, {
        delay: nextExecutionTime - Date.now() // 延迟执行
    });
}

// 取消定时任务
export const removeServiceTask = async (serviceId: string) => {
    const job = await serviceQueue.getJob(serviceId);
    if (job) {
        await job.remove();
        printInfo(`Service task ${serviceId} removed`);
    } else {
        printWarning(`Service task ${serviceId} not found or already removed`);
    }
};

// 检查队列中是否存在指定的服务
async function isServiceInQueue(serviceId: string): Promise<boolean> {
    const job = await serviceQueue.getJob(serviceId);
    return !!job; // 如果 job 存在，返回 true，否则返回 false
}

// 检查并添加未在队列中的服务
async function checkAndAddMissingServices() {
    // 查找 status 为 "UP" 的所有服务
    const upServices = await Service.find({ status: 'UP' });

    for (const service of upServices) {
        const isInQueue = await isServiceInQueue(service.id);
        if (!isInQueue) {
            // 如果服务不在队列中，添加它到队列
            printWarning(`Service ${service.id} is missing from the queue. Adding it now.`);
            // 获取对应的 Service 类
            const ServiceClass = ServiceRegistry.getService(service.type);
            const serviceInstance = new ServiceClass();

            const interval = serviceInstance.interval || 10 * 1000; // 获取服务的执行间隔（默认为 10min）
            await addServiceTask(service.id, interval);
        }
    }
}

// 在程序启动时检查所有未在队列中的服务
export async function initializeServiceQueueCheck() {
    printInfo('Checking services status...');
    await checkAndAddMissingServices();

    // 设置每隔 10 分钟检查一次
    setInterval(async () => {
        printInfo('Scheduled check for missing services...');
        await checkAndAddMissingServices();
    }, 10 * 60 * 1000); // 10 分钟
}