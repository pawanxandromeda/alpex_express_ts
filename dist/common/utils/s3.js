"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBufferToS3 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const env_1 = require("../../config/env");
const s3 = new client_s3_1.S3Client({ region: env_1.env.awsRegion || undefined });
const uploadBufferToS3 = async (buffer, key, contentType) => {
    if (!env_1.env.s3Bucket || !env_1.env.awsAccessKeyId || !env_1.env.awsSecretAccessKey)
        throw new Error("S3 is not configured. Set S3 env vars.");
    const params = {
        Bucket: env_1.env.s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: "public-read",
    };
    const command = new client_s3_1.PutObjectCommand(params);
    await s3.send(command);
    // NOTE: Make sure bucket has public access or uses signed urls in production
    return `https://${env_1.env.s3Bucket}.s3.${env_1.env.awsRegion}.amazonaws.com/${key}`;
};
exports.uploadBufferToS3 = uploadBufferToS3;
