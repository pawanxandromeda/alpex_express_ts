import { google } from "googleapis";
import { Readable } from "stream";

const auth = new google.auth.GoogleAuth({
  keyFile: "google-drive-key.json",
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

export const uploadToDrive = async (file: Express.Multer.File) => {
  if (!file || !file.buffer) {
    throw new Error("File buffer missing");
  }

  const bufferStream = Readable.from(file.buffer); 

  const response = await drive.files.create({
    requestBody: {
      name: file.originalname,
      parents: ["1WUVaaJnsh8BYUIppzFVsZ5QOC1VPkhgd"],
    },
    media: {
      mimeType: file.mimetype,
      body: bufferStream, 
    },
  });

  const fileId = response.data.id!;

  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return `https://drive.google.com/uc?id=${fileId}`;
};
