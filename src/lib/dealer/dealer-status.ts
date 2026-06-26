/** Bayi kaydı aktif mi? (active / ACTIVE / Active) */
export function isDealerAccountActive(status: string | null | undefined): boolean {
  return (status || "").trim().toUpperCase() === "ACTIVE";
}

/** DealerApproval kaydı onaylı mı? */
export function isDealerApprovalActive(status: string | null | undefined): boolean {
  return (status || "").trim().toUpperCase() === "ACTIVE";
}
