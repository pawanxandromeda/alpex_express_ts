import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../../config/env";

const s3 = new S3Client({ region: env.awsRegion || undefined });

export const uploadBufferToS3 = async (
  buffer: Buffer,
  key: string,
  contentType: string
) => {
  if (!env.s3Bucket || !env.awsAccessKeyId || !env.awsSecretAccessKey)
    throw new Error("S3 is not configured. Set S3 env vars.");

  const params = {
    Bucket: env.s3Bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: "public-read",
  } as any;

  const command = new PutObjectCommand(params);
  await s3.send(command);

  // NOTE: Make sure bucket has public access or uses signed urls in production
  return `https://${env.s3Bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
};
