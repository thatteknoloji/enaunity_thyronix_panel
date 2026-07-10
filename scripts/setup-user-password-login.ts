/**
 * Kullanıcıyı şifre ile girişe geçir, Google bağlantısını kaldır, tüm onayları muaf tut.
 *
 * Run (prod sunucuda):
 *   npx tsx scripts/setup-user-password-login.ts kokismail84@gmail.com 12345 --waive-all
 */
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import {
  MEMBER_CHECKLIST_KEYS,
  MEMBER_REQUIRED_DOCUMENTS,
  MEMBER_REQUIRED_CONTRACTS,
  EMPTY_MEMBER_CHECKLIST,
} from "../src/lib/members/checklist";

const email = process.argv[2]?.trim().toLowerCase();
const password = process.argv[3]?.trim();
const waiveAll = process.argv.includes("--waive-all");

if (!email || !password) {
  console.error("Usage: npx tsx scripts/setup-user-password-login.ts <email> <password> [--waive-all]");
  process.exit(1);
}

if (password.length < 5) {
  console.error("Şifre en az 5 karakter olmalı");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error("Kullanıcı bulunamadı:", email);
    process.exit(1);
  }

  const now = new Date();
  const passwordHash = await hashPassword(password);

  const checklist = { ...EMPTY_MEMBER_CHECKLIST };
  for (const key of MEMBER_CHECKLIST_KEYS) checklist[key] = true;

  const waivers = waiveAll
    ? {
        checklistKeys: [...MEMBER_CHECKLIST_KEYS],
        documentTypes: [...MEMBER_REQUIRED_DOCUMENTS],
      }
    : JSON.parse(user.adminApprovalWaiversJson || "{}");

  const contracts = waiveAll
    ? [...MEMBER_REQUIRED_CONTRACTS]
    : JSON.parse(user.contractsAcceptedJson || "[]");

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: passwordHash,
      googleId: null,
      status: "active",
      kvkkAcceptedAt: user.kvkkAcceptedAt ?? now,
      contractsAcceptedJson: JSON.stringify(contracts),
      approvalChecklistJson: JSON.stringify(checklist),
      adminApprovalWaiversJson: JSON.stringify(waivers),
      approvedAt: now,
      reviewedBy: "admin-setup-script",
      adminNote: "Şifre girişi — Google kaldırıldı, admin muafiyet",
      legalReacceptStatus: "ok",
      rejectionReason: "",
    },
  });

  console.log("OK:", {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    status: updated.status,
    googleId: updated.googleId,
    hasPassword: !!updated.password,
    waived: waiveAll,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
