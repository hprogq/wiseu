import { Redis } from "ioredis"
import config from './config';

const redis = new Redis(config.redisUri);

redis.on("connect", function () {
    console.log('\u001b[34m[INFO]\u001b[0m Redis connected');
});

redis.on("error", function (error: any) {
    console.log(error);
});

export default redis;