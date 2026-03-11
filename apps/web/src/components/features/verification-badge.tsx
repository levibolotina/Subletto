import Badge from "@/components/ui/badge";
import type { VerificationStatus, UserRole } from "@subletto/shared";

interface VerificationBadgeProps {
  status: VerificationStatus | null;
  role: UserRole | string;
}

export default function VerificationBadge({ status, role }: VerificationBadgeProps) {
  // Seekers don't need verification
  if (role === "SEEKER") {
    return <Badge variant="blue">Seeker</Badge>;
  }

  if (role === "ADMIN") {
    return <Badge variant="gray">Admin</Badge>;
  }

  // LISTER states
  if (!status) {
    return <Badge variant="gray">Unverified</Badge>;
  }

  const config = {
    PENDING: { variant: "yellow" as const, label: "Pending Review" },
    VERIFIED: { variant: "green" as const, label: "Verified" },
    REJECTED: { variant: "red" as const, label: "Rejected" },
  };

  const { variant, label } = config[status] ?? { variant: "gray" as const, label: status };

  return <Badge variant={variant}>{label}</Badge>;
}
