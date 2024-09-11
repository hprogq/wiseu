import { bullMQRedis } from "../../config/redis";
import { Queue, Worker, Job } from "bullmq";
import mongoose from "mongoose";
import Service from "../../models/Service";
import ServiceRegistry from "../../services/service/serviceRegistry";
import { printInfo, printError, printWarning } from "../../utils/console";

const serviceQueue = new Queue("serviceQueue", {
  connection: bullMQRedis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

const worker = new Worker(
  "serviceQueue",
  async (job: Job) => {
    const { serviceId } = job.data;

    const service = await Service.findById(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    const ServiceClass = ServiceRegistry.getService(service.type);
    const serviceInstance = new ServiceClass();

    await serviceInstance.init(
      service.identityId,
      service.configuration,
      serviceId,
    );
    await serviceInstance.update();

    service.lastUpdated = new Date();
    await service.save();

    const interval = serviceInstance.interval;
    if (service.status === "UP" && interval > 0) {
      await addServiceTask(serviceId, interval);
    }
  },
  { connection: bullMQRedis },
);

worker.on("failed", async (job, err) => {
  printError(`Job ${job?.id} failed with error: ${err.message}`);

  if (job) {
    const { serviceId } = job.data;
    const service = await Service.findById(serviceId);
    if (service) {
      service.status = "FAILED";
      service.failureReason = `${Date.now()} - ${err.message}`;
      await service.save();
    }
  }
});

export async function addServiceTask(serviceId: string, interval: number) {
  const jobId = `${serviceId}_${Date.now()}`;
  await removeServiceTask(serviceId); // 移除旧任务
  const nextExecutionTime = Date.now() + interval;

  await serviceQueue.add(
    "updateService",
    { serviceId },
    {
      jobId,
      delay: nextExecutionTime - Date.now(),
    },
  );
  printInfo(`Added task for service ${serviceId} with jobId ${jobId}`);
}

export const removeServiceTask = async (serviceId: string) => {
  const jobs = await serviceQueue.getJobs(["delayed", "waiting"]);
  const serviceJobs = jobs.filter((job) => job.data.serviceId === serviceId);

  for (const job of serviceJobs) {
    await job.remove();
    printInfo(`Removed job ${job.id} for service ${serviceId}`);
  }
};

async function isServiceInQueue(serviceId: string): Promise<boolean> {
  const jobs = await serviceQueue.getJobs(["delayed", "waiting"]);
  return jobs.some((job) => job.data.serviceId === serviceId);
}

async function checkAndAddMissingServices() {
  const upServices = await Service.find({ status: "UP" });

  for (const service of upServices) {
    const isInQueue = await isServiceInQueue(service.id);
    if (!isInQueue) {
      const ServiceClass = ServiceRegistry.getService(service.type);
      const serviceInstance = new ServiceClass();
      const interval = serviceInstance.interval;
      if (interval > 0) {
        printWarning(
          `Service ${service.id} is missing from the queue. Adding it now.`,
        );

        await addServiceTask(service.id, interval);
      }
    }
  }
}

export async function initializeServiceQueueCheck() {
  printInfo("Checking services status...");
  await checkAndAddMissingServices();

  setInterval(
    async () => {
      printInfo("Scheduled check for missing services...");
      await checkAndAddMissingServices();
    },
    10 * 60 * 1000,
  );
}
