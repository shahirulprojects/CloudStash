"use server";

import { ID } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { appwriteConfig } from "../appwrite/config";
import { InputFile } from "node-appwrite/file";
import { constructFileUrl, getFileType, parseStringify } from "../utils";
import { revalidatePath } from "next/cache";

const handleError = (error: unknown, message: string) => {
  console.error(message, error);
  if (error instanceof Error) {
    throw new Error(error.message);
  }
  throw new Error(message);
};

// UPLOAD FILE STARTS
export const uploadFile = async ({
  file,
  ownerId,
  accountId,
  path,
}: UploadFileProps) => {
  const { storage, databases } = await createAdminClient();

  try {
    // creates an InputFile instance from the uploaded file buffer and its name
    const inputFile = InputFile.fromBuffer(file, file.name);

    // stores the file in the specified bucket using a unique ID (appwrite storage functionality)
    const bucketFile = await storage.createFile(
      appwriteConfig.bucketId,
      ID.unique(),
      inputFile
    );

    // constructs a document representing the file's metadata
    const fileDocument = {
      type: getFileType(bucketFile.name).type, // determines the file type
      name: bucketFile.name, // stores the original file name
      url: constructFileUrl(bucketFile.$id), // generates the file's accessible URL
      extension: getFileType(bucketFile.name).extension, // extracts the file extension
      size: bucketFile.sizeOriginal, // captures the original file size
      owner: ownerId, // associates the file with its owner
      accountId, // links the file to the user's account
      users: [], // initializes an array for users with access to the bucket
      bucketFileId: bucketFile.$id, // stores the unique ID of the file in the bucket
    };

    // attempts to create a document in the database for the uploaded file
    const newFile = await databases
      .createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        ID.unique(),
        fileDocument
      )
      .catch(async (error: unknown) => {
        // if document creation fails, delete the file from the bucket
        await storage.deleteFile(appwriteConfig.bucketId, bucketFile.$id);
        handleError(error, "Failed to create file document");
      });

    // refreshes the directory to reflect the newly uploaded file
    revalidatePath(path);
    return parseStringify(newFile); // returns the newly created file document
  } catch (error) {
    handleError(error, "Failed to upload file");
  }
};

// UPLOAD FILE ENDS
