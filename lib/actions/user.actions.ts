"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { appwriteConfig } from "../appwrite/config";
import { parseStringify } from "../utils";
import { cookies } from "next/headers";
import { avatarPlaceholderUrl } from "@/constants";
import { redirect } from "next/navigation";
import * as bcrypt from "bcryptjs";

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
  const { account } = await createAdminClient(); // get admin level permission to access the account

  try {
    // Delete any existing email tokens for this user
    try {
      await account.deleteSessions();
    } catch (error) {
      console.log("No existing sessions to clear");
    }

    // Create new email token (15 minutes expiry by default)
    const session = await account.createEmailToken(ID.unique(), email);
    return session.userId;
  } catch (error: any) {
    console.error("Failed to send email OTP:", error);
    throw new Error("Failed to send OTP. Please try again.");
  }
};

const handleError = (error: unknown, message: string) => {
  console.error(message, error);
  if (error instanceof Error) {
    throw new Error(error.message);
  }
  throw new Error(message);
};

// CREATE ACCOUNT STARTS
export const createAccount = async ({
  fullName,
  email,
  password,
}: {
  fullName: string;
  email: string;
  password: string;
}) => {
  try {
    // check if the user exists by passing the inserted email
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return parseStringify({ accountId: null, error: "User already exists" });
    }

    // Hash only the password (cannot hashed email since we wont be able to won't be able to send OTP emails,can't verify email uniqueness properly, users won't be able to use their email to log in)
    const salt = await bcrypt.genSalt(10); // creates random string like "8x7fgh3k"
    const hashedPassword = await bcrypt.hash(password, salt); // will be like (password + 8x7fgh3k) and then it got hashed. This will result in different hashedPassword (since their salt is different) even if two users have the same password

    //if user exists send the email OTP to the inserted email
    const accountId = await sendEmailOTP({ email });
    if (!accountId) {
      return parseStringify({ accountId: null, error: "Failed to send OTP" });
    }

    // Create new user
    const { databases } = await createAdminClient();

    // access the specific database and the specific collection and then fill in the entered data
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      ID.unique(),
      {
        fullName,
        email,
        avatar: avatarPlaceholderUrl,
        accountId,
        password: hashedPassword,
      }
    );

    return parseStringify({ accountId }); // whenever passing large payload through server actions, we first have to stringify and then parse that value
  } catch (error) {
    handleError(error, "Failed to create account");
  }
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

    try {
      // create a session for the user
      const session = await account.createSession(accountId, password);

      // set the session to cookies with correct options
      const cookieStore = await cookies();
      cookieStore.set("appwrite-session", session.secret, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      });

      return parseStringify({ sessionId: session.$id });
    } catch (error: any) {
      // Check if the error is related to invalid or expired OTP
      if (error?.message?.includes("token") || error?.code === 401) {
        if (error?.message?.includes("expired")) {
          return parseStringify({
            error: "OTP has expired. Please request a new one.",
          });
        }
        return parseStringify({ error: "Invalid OTP code. Please try again." });
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Verification error:", error);
    throw new Error(
      error?.message || "Failed to verify OTP. Please try again."
    );
  }
};
// VERIFY OTP ENDS

// GET CURRENT USER STARTS
export const getCurrentUser = async () => {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("appwrite-session");

    if (!session || !session.value) {
      return null;
    }

    const { databases, account } = await createSessionClient();

    try {
      const result = await account.get(); // get the account from the session

      const user = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        [Query.equal("accountId", result.$id)] // search the database and collection to find accountId that matches the result id
      );

      if (user.total <= 0) return null;

      return parseStringify(user.documents[0]);
    } catch (error) {
      console.error("Error getting user:", error);
      return null;
    }
  } catch (error) {
    console.error("Session error:", error);
    return null;
  }
};
// GET CURRENT USER ENDS

// SIGN IN USER STARTS
export const SignInUser = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  try {
    // check if user exists
    const existingUser = await getUserByEmail(email);
    if (!existingUser) {
      return parseStringify({ accountId: null, error: "User not found" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!isValidPassword) {
      return parseStringify({ accountId: null, error: "Invalid password" });
    }

    // Send OTP for 2FA
    await sendEmailOTP({ email });

    return parseStringify({ accountId: existingUser.accountId });
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
    const cookieStore = await cookies();
    cookieStore.delete("appwrite-session");
  } catch (error) {
    handleError(error, "Failed to sign out user");
  } finally {
    redirect("/sign-in");
  }
};
// SIGN OUT USER ENDS
