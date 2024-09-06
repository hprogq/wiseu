import { Redis } from "ioredis"
import config from './config';
import {printError, printInfo} from "../utils/console";

export const sessionRedis = new Redis(config.sessionRedisUri);
export const bullMQRedis = new Redis(config.bullMQRedisUri, {
    maxRetriesPerRequest: null
});

sessionRedis.on("connect", function () {
    printInfo('Session Redis connected');
});

sessionRedis.on("error", function (error: any) {
    printError(error);
});

bullMQRedis.on("connect", function () {
    printInfo('BullMQ Redis connected');
});

bullMQRedis.on("error", function (error: any) {
    printError(error);
});