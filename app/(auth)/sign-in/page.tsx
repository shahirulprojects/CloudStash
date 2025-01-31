import AuthForm from "@/components/AuthForm";
import { Suspense } from "react";

const SignIn = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <AuthForm type="sign-in" />
  </Suspense>
);

export default SignIn;
