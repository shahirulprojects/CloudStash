import AuthForm from "@/components/AuthForm";
import React, { Suspense } from "react";

const PasswordReset = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <AuthForm type="passwordreset" />
  </Suspense>
);

export default PasswordReset;
