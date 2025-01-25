"use server";

import { Account, Avatars, Client, Databases, Storage } from "node-appwrite";
import { appwriteConfig } from "./config";
import { cookies } from "next/headers";

// separating client for each request (sessionClient and adminClient) to avoid sharing the same connection between requests which can lead to security issue such as exposing someone else's data or session

// for regular user
export const createSessionClient = async () => {
  // configuration so that it will refer to the correct endpoint and projectId
  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId);

  const session = (await cookies()).get("appwrite-session");

  if (!session || !session.value) throw new Error("No session");

  client.setSession(session.value);

  return {
    get account() {
      return new Account(client); // account based on the client variable that have been defined earlier
    },
    get databases() {
      return new Databases(client); // database based on the client variable that have been defined earlier
    },
  };
};

// for admin (only performed at server side)
export const createAdminClient = async () => {
  // configuration so that it will refer to the correct endpoint and projectId
  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId)
    .setKey(appwriteConfig.secretKey); // to allow performing admin actions

  return {
    get account() {
      return new Account(client); // account based on the client variable that have been defined earlier
    },
    get databases() {
      return new Databases(client); // database based on the client variable that have been defined earlier
    },
    get storage() {
      return new Storage(client); // storage based on the client variable that have been defined earlier
    },
    get avatars() {
      return new Avatars(client); // avatar based on the client variable that have been defined earlier
    },
  };
};
