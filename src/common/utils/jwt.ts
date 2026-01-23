import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";

export const generateAccessToken = (payload: any) => {
  const options: SignOptions = { expiresIn: 3600 };
  return jwt.sign(payload, env.jwtSecret as string, options);
};

export const generateRefreshToken = (payload: any) => {
  const options: SignOptions = { expiresIn: 3600 };
  return jwt.sign(payload, env.jwtRefreshSecret as string, options);
};

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.jwtSecret);

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.jwtRefreshSecret);
