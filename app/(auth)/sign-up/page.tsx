import AuthForm from "@/components/AuthForm";
import { Suspense } from "react";

const SignUp = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <AuthForm type="sign-up" />;
  </Suspense>
);

export default SignUp;
