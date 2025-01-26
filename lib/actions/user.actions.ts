"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { appwriteConfig } from "../appwrite/config";
import { parseStringify } from "../utils";
import { cookies } from "next/headers";
import { avatarPlaceholderUrl } from "@/constants";
import { redirect } from "next/navigation";

// create account flow
// 1. User enters full name and email
// 2. Check if the user already exist using the email (we will use this to identify if we still need to create a new user document or not)
// 3. Send One-Time-Password (OTP) to user's email
// 4. This will send a secret key for creating a session. The secret key or OTP will be sent to the user's account email
// 5. Create a new user document if the user is a new user
// 6. Return the user's accountId that will be used to complete the login process later with the OTP
// 7. Verify OTP and authenticate to login

const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient(); // get permission of admin to access the database

  // get the documents from a specific database and a specific collection
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("email", [email])] // search for a specifc attribute (email) and return the list of array of the email
  );

  return result.total > 0 ? result.documents[0] : null;
};

export const sendEmailOTP = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient(); // get permission of admin to access the database

  try {
    const session = await account.createEmailToken(ID.unique(), email); // pass in the unique user ID and the inserted email to get access to the session

    return session.userId;
  } catch (error) {
    handleError(error, "Failed to send email OTP"); // pass in the error and the message
  }
};

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

// CREATE ACCOUNT STARTS
export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  // check if the user exists by passing the inserted email
  const existingUser = await getUserByEmail(email);

  //if user exists send the email OTP to the inserted email
  const accountId = await sendEmailOTP({ email });
  if (!accountId) throw new Error("Failed to send an OTP");

  // if user does not exists meaning that the email is not used yet, we will create a new user
  if (!existingUser) {
    const { databases } = await createAdminClient();

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(), // give a unique user id to the user
      // define the attributes for the user based on the users collection
      {
        fullName,
        email,
        avatar: avatarPlaceholderUrl,
        accountId,
      }
    );
  }

  return parseStringify({ accountId }); // whenever passing large payload through server actions, we first have to stringify and then parse that value
};
// CREATE ACCOUNT ENDS

// VERIFY OTP STARTS
export const verifySecret = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}) => {
  try {
    const { account } = await createAdminClient();

    // create a session for the user
    const session = await account.createSession(accountId, password);

    // set the session to a cookie with correct options
    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify({ sessionId: session.$id });
  } catch (error) {
    handleError(error, "Failed to verify OTP");
  }
};
// VERIFY OTP ENDS

// GET CURRENT USER STARTS
export const getCurrentUser = async () => {
  const { databases, account } = await createSessionClient(); // session client because we want to get the info about the session

  const result = await account.get(); // get the account that is using the session

  const user = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("accountId", result.$id)] // check the database to find the accountId that matches the account that is using the session
  );

  if (user.total <= 0) return null; // if there is no user return null

  return parseStringify(user.documents[0]); // if there is a user we will parseStringify it
};

// GET CURRENT USER ENDS

// SIGN IN USER STARTS
export const SignInUser = async ({ email }: { email: string }) => {
  try {
    // check if user exists or not
    const existingUser = await getUserByEmail(email);

    // if exists, send OTP
    if (existingUser) {
      await sendEmailOTP({ email });
      return parseStringify({ accountId: existingUser.accountId }); // return the account Id from the existing user
    }

    // if not exists, return null
    return parseStringify({ accountId: null, error: "User not found" });
  } catch (error) {
    handleError(error, "Failed to sign in user");
  }
};
// SIGN IN USER ENDS

// SIGN OUT USER STARTS
export const signOutUser = async () => {
  const { account } = await createSessionClient();

  try {
    // delete the current session
    await account.deleteSession("current");

    // delete the cookies
    (await cookies()).delete("appwrite-session");
  } catch (error) {
    handleError(error, "Failed to sign out user");
  } finally {
    redirect("/sign-in");
  }
};

// SIGN OUT USER ENDS
