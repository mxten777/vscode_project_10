type OperationsConsoleContext = {
  role?: string;
  user?: {
    email?: string | null;
  } | null;
};

function getOperationsAdminEmails() {
  return (process.env.ADMIN_CONSOLE_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isOperationsAdminEmail(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }

  return getOperationsAdminEmails().includes(normalizedEmail);
}

export function canAccessOperationsConsole(context: OperationsConsoleContext) {
  return context.role === "admin" && isOperationsAdminEmail(context.user?.email);
}