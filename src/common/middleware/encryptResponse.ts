import { Request, Response, NextFunction } from "express";
import CryptoJS from "crypto-js";

const secretKey = process.env.ENCRYPT_KEY;
if (!secretKey) {
  throw new Error("ENCRYPT_KEY is missing in .env");
}

// Middleware
const encryptResponse = (req: Request, res: Response, next: NextFunction) => {
  // Cast res to include encryptAndSend
  (res as Response & { encryptAndSend: (data: unknown) => void }).encryptAndSend =
    (data: unknown) => {
      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify(data),
        secretKey
      ).toString();

      res.json({ payload: encryptedData });
    };

  next();
};

export default encryptResponse;
