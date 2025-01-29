"use server";

import { ID, Models, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { appwriteConfig } from "../appwrite/config";
import { InputFile } from "node-appwrite/file";
import { constructFileUrl, getFileType, parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./user.actions";

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

    // stores the file in the specified bucket using a unique ID (stores in the appwrite storage not appwrite database)
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

// CREATE QUERY STARTS

const createQueries = (currentUser: Models.Document) => {
  const queries = [
    // check if the file is owned by the owner or shareed to other users through their email
    Query.or([
      Query.equal("owner", [currentUser.$id]),
      Query.contains("users", [currentUser.email]),
    ]),
  ];

  // TODO: Search,sort,limits,etc

  return queries;
};

// CREATE QUERY ENDS

// GET FILE STARTS
export const getFiles = async () => {
  const { databases } = await createAdminClient();

  try {
    // show only the files that the current user has access to (either owned or shared)
    const currentUser = await getCurrentUser();

    if (!currentUser) throw new Error("User not found");

    const queries = createQueries(currentUser);

    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      queries
    );

    return parseStringify(files);
  } catch (error) {
    handleError(error, "Failed to get files");
  }
};

// GET FILE ENDS

// RENAME FILE STARTS
export const renameFile = async ({
  fileId,
  name,
  extension,
  path,
}: RenameFileProps) => {
  const { databases } = await createAdminClient();

  try {
    const newName = `${name}.${extension}`; // constructs the new file name by appending the extension to the base name
    // updates the file's metadata in the database, not the actual file in storage, since we manage metadata separately
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      {
        name: newName, // sets the new name for the file in the database
      }
    );

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Failed to rename file");
  }
};
// RENAME FILE ENDS

// SHARE FILE STARTS
export const updateFileUsers = async ({
  fileId,
  emails,
  path,
}: UpdateFileUsersProps) => {
  const { databases } = await createAdminClient();

  try {
    // updates the file's metadata in the database, not the actual file in storage, since we manage metadata separately
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      {
        users: emails, // change the users attribute to include the newly inserted emails
      }
    );

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Failed to update file");
  }
};
// SHARE FILE ENDS
