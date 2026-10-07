export const PASSWORD_MIN_LENGTH = 7;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_REQUIREMENTS = "Use 7–128 characters, including at least one uppercase letter, one number and one special character.";
export const EMAIL_REQUIREMENTS = "Enter a valid email address, such as name@example.com.";

export function isValidEmail(email: string) {
  if (email.length > 254 || /\s/.test(email)) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return false;
  const labels = domain.split(".");
  return labels.length >= 2 && labels.every(label => label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))
    && /^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/i.test(labels.at(-1) ?? "");
}

export function isValidNewPassword(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH
    && /\p{Lu}/u.test(password) && /\p{Nd}/u.test(password) && /[^\p{L}\p{N}\s]/u.test(password);
}
