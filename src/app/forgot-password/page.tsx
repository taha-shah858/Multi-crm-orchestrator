import PasswordRecoveryForm from "@/components/auth/PasswordRecoveryForm";

export const metadata = { title: "Forgot password | Multi-CRM", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <PasswordRecoveryForm mode="request" />;
}
