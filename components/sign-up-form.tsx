"use client";

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleButton } from "@/components/auth/google-button";
import { useState } from "react";
import { SERVICE_CATEGORIES } from "@/lib/service-filters";
import { normalizeEthiopianPhone, type AccountType } from "@/lib/provider-screening";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [role, setRole] = useState<"user" | "provider">("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }
    const phone = normalizeEthiopianPhone(phoneNumber);
    if (!phone) {
      setError("Enter a valid Ethiopian mobile number, e.g. +251 911 234 567");
      setIsLoading(false);
      return;
    }
    const isProvider = role === "provider";
    const isBusiness = isProvider && accountType === "business";
    if (isBusiness && (!businessName.trim() || !businessCategory)) {
      setError("Business name and category are required for a registered business");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/profile`,
          data: {
            role,
            full_name: fullName.trim(),
            phone_number: phone,
            account_type: isProvider ? accountType : null,
            business_name: isBusiness ? businessName.trim() : null,
            business_category: isProvider ? businessCategory || null : null,
          },
        },
      });
      if (error) throw error;

      // Success: show notification and redirect
      toast.success(
        isProvider
          ? "Account created! Next: verify your identity and list your service."
          : "Account created successfully!"
      );
      router.refresh(); // Clear cache and sync session
      router.push(isProvider ? "/services/new" : "/");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button
              type="button"
              variant={role === "user" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setRole("user")}
            >
              I am a User
            </Button>
            <Button
              type="button"
              variant={role === "provider" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setRole("provider")}
            >
              I am a Provider
            </Button>
          </div>

          {/* Providers continue to the listing wizard, which completes their provider profile */}
          <GoogleButton next={role === "provider" ? "/services/new" : "/"} label="Sign up with Google" />
          <form onSubmit={handleSignUp} className="mt-4">
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  placeholder="John Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+251 911 234 567"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  aria-invalid={phoneNumber.length > 6 && !normalizeEthiopianPhone(phoneNumber)}
                />
                <p className="text-xs text-muted-foreground">
                  Ethiopian mobile (Ethio telecom or Safaricom). {role === "provider" && "We may call to verify you."}
                </p>
              </div>

              {role === "provider" && (
                <>
                  <div className="grid gap-2">
                    <Label>Account type</Label>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
                      {([
                        ["individual", "Individual / Freelancer"],
                        ["business", "Registered Business"],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={accountType === value}
                          onClick={() => setAccountType(value)}
                          className={cn(
                            "min-h-[44px] rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                            accountType === value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-input text-muted-foreground hover:bg-secondary"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {accountType === "business" && (
                    <div className="grid gap-2">
                      <Label htmlFor="business-name">Registered business name</Label>
                      <Input
                        id="business-name"
                        placeholder="e.g. Abebe Plumbing PLC"
                        required
                        maxLength={150}
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        You can upload your Trade License / TIN in the next step for a Licensed Business badge.
                      </p>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="business-category">Main service category</Label>
                    <select
                      id="business-category"
                      required={accountType === "business"}
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select a category</option>
                      {SERVICE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </>
              )}

              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}

              {/* Terms & Conditions Checkbox */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary underline underline-offset-4 hover:text-primary/80">
                    Terms of Service
                  </Link>
                  {" "}and{" "}
                  <Link href="/privacy" className="text-primary underline underline-offset-4 hover:text-primary/80">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !agreedToTerms}>
                {isLoading ? "Creating an account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
