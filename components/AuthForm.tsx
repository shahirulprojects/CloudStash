"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  createAccount,
  passwordReset,
  SignInUser,
  updatePassword,
} from "@/lib/actions/user.actions";
import OTPModal from "./OTPModal";

type FormType = "sign-in" | "sign-up" | "passwordreset";

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const searchParams = useSearchParams();
  const preFilledEmail = searchParams.get("email");

  // 1. Define your form.
  const formSchema = z
    .object({
      email: z.string().email(),
      fullName:
        type == "sign-up" ? z.string().min(2).max(50) : z.string().optional(),
      password:
        type === "passwordreset" && !showNewPassword
          ? z.string().optional()
          : z
              .string()
              .min(8, "Password must be at least 8 characters")
              .max(50, "Password cannot exceed 50 characters")
              .regex(
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character"
              ),
      confirmPassword:
        type === "sign-up" || (type === "passwordreset" && showNewPassword)
          ? z.string()
          : z.string().optional(),
    })
    .refine(
      (data) => {
        if (
          type === "sign-up" ||
          (type === "passwordreset" && showNewPassword)
        ) {
          return data.password === data.confirmPassword;
        }
        return true;
      },
      {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      }
    );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: preFilledEmail ?? "",
      password: "",
      confirmPassword: "",
    },
  });

  // 2. Define a submit handler.
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      let response;
      if (type === "sign-up") {
        response = await createAccount({
          fullName: values.fullName || "",
          email: values.email,
          password: values.password || "",
        });
      } else if (type === "sign-in") {
        response = await SignInUser({
          email: values.email,
          password: values.password || "",
        });
      } else if (type === "passwordreset") {
        if (!showNewPassword) {
          // First step: Send OTP
          response = await passwordReset({ email: values.email });
          if (response?.accountId) {
            setAccountId(response.accountId);
          }
          if (response?.error) {
            setErrorMessage(response.error);
          }
          return;
        } else {
          // Second step: Update password
          if (!accountId) {
            setErrorMessage("Missing account ID");
            return;
          }
          response = await updatePassword({
            accountId: accountId,
            newPassword: values.password || "",
            confirmPassword: values.confirmPassword || "",
          });
          if (response?.success) {
            router.push("/sign-in");
            return;
          }
          if (response?.error) {
            setErrorMessage(response.error);
          }
          return;
        }
      }

      if (response?.error) {
        setErrorMessage(response.error);
        return;
      }

      if (!response?.accountId) {
        setErrorMessage("Something went wrong. Please try again.");
        return;
      }

      setAccountId(response.accountId);
    } catch (error: any) {
      setErrorMessage(
        error?.message || "Failed to process request. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="auth-form"
          suppressHydrationWarning
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              form.handleSubmit(onSubmit)();
            }
          }}
        >
          <h1 className="form-title">
            {type === "passwordreset"
              ? showNewPassword
                ? "Set New Password"
                : "Password Reset"
              : type === "sign-in"
                ? "Sign In"
                : "Sign Up"}
          </h1>
          {type === "sign-up" && (
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <div className="shad-form-item">
                    <FormLabel className="shad-form-label">Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
                        className="shad-input"
                        {...field}
                        autoComplete="name"
                        suppressHydrationWarning
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="shad-form-message" />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className={showNewPassword ? "hidden" : ""}>
                <div className="shad-form-item">
                  <FormLabel className="shad-form-label">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      className="shad-input"
                      {...field}
                      autoComplete="email"
                      suppressHydrationWarning
                    />
                  </FormControl>
                </div>
                <FormMessage className="shad-form-message" />
              </FormItem>
            )}
          />

          {type !== "passwordreset" && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="shad-form-item">
                    <FormLabel className="shad-form-label">Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        className="shad-input"
                        {...field}
                        suppressHydrationWarning
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="shad-form-message" />
                </FormItem>
              )}
            />
          )}

          {type === "sign-in" && (
            <div className="flex justify-end">
              <Link
                href={`/sign-in/passwordreset${form.getValues("email") ? `?email=${encodeURIComponent(form.getValues("email"))}` : ""}`}
                className="body-2 text-brand"
              >
                Forgot Password?
              </Link>
            </div>
          )}

          {type === "sign-up" && (
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <div className="shad-form-item">
                    <FormLabel className="shad-form-label">
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your password"
                        className="shad-input"
                        {...field}
                        suppressHydrationWarning
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="shad-form-message" />
                </FormItem>
              )}
            />
          )}

          {type === "passwordreset" && (
            <>
              {showNewPassword && (
                <>
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="shad-form-item">
                          <FormLabel className="shad-form-label">
                            New Password
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter new password"
                              className="shad-input"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage className="shad-form-message" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <div className="shad-form-item">
                          <FormLabel className="shad-form-label">
                            Confirm New Password
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm new password"
                              className="shad-input"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage className="shad-form-message" />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </>
          )}

          <Button
            type="submit"
            className="form-submit-button"
            disabled={isLoading}
            suppressHydrationWarning
          >
            {type === "sign-in"
              ? "Sign In"
              : type === "passwordreset"
                ? "Reset Password"
                : "Sign Up"}
            {isLoading && (
              <Image
                src="/assets/icons/loader.svg"
                alt="loader"
                width={24}
                height={24}
                className="animate-spin ml-2"
                priority
              />
            )}
          </Button>
          {errorMessage && <p className="error-message">*{errorMessage}</p>}

          <div className="body-2 flex justify-center">
            <p className="text-light-100">
              {type === "sign-in"
                ? "Don't have an account?"
                : "Already have an account?"}
            </p>
            <Link
              href={type === "sign-in" ? "/sign-up" : "/sign-in"}
              className="ml-1 font-medium text-brand"
            >
              {type === "sign-in" ? "Sign Up" : "Sign In"}
            </Link>
          </div>
        </form>
      </Form>
      {/* OTP Verification */}
      {/* if accountId exists (meaning that the user has try to verify themselves) */}
      {accountId && (
        <OTPModal
          email={form.getValues("email")}
          accountId={accountId}
          onVerificationSuccess={() => {
            if (type === "passwordreset") {
              setShowNewPassword(true);
            } else if (type === "sign-up") {
              router.push("/");
            } else if (type === "sign-in") {
              router.push("/");
            }
          }}
        />
      )}
    </>
  );
};

export default AuthForm;
