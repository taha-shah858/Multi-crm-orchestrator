import PasswordRecoveryForm from "@/components/auth/PasswordRecoveryForm";

export const metadata = { title: "Reset password | Multi-CRM", referrer: "no-referrer" as const, robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return <PasswordRecoveryForm mode="reset" />;
}
