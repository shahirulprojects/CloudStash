export const appwriteConfig = {
  // ! so that typescript will know that it exists
  // we use PUBLIC when the env will be publicly available at the front end,
  // if it is only for the backend server side action then we dont use PUBLIC (in this case the admin actions will be on the server side only)
  endpointUrl: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
  usersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION!,
  filesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
  bucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
  secretKey: process.env.NEXT_APPWRITE_SECRET!,
  jwtSecret: process.env.JWT_SECRET!,
};
