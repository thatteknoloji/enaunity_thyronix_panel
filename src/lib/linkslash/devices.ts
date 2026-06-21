import { prisma } from "@/lib/db";
import { isAdminRole } from "@/lib/auth/admin-access";
import { LINKSLASH_MODULE_KEY } from "./access";
import { getDealerModuleLicense } from "@/lib/modules/access";

export const DEFAULT_MAX_DEVICES = 1;

export type DeviceBindResult =
  | { ok: true; device: { id: string; deviceId: string; deviceName: string } }
  | { ok: false; code: "DEVICE_LIMIT"; message: string; activeDevice?: { deviceName: string; lastSeenAt: Date } };

function parseLicenseMeta(metadataJson: string): { maxDevices: number } {
  try {
    const meta = JSON.parse(metadataJson || "{}") as { maxDevices?: number };
    return { maxDevices: meta.maxDevices && meta.maxDevices > 0 ? meta.maxDevices : DEFAULT_MAX_DEVICES };
  } catch {
    return { maxDevices: DEFAULT_MAX_DEVICES };
  }
}

export async function getMaxDevicesForUser(userId: string, dealerId: string | null | undefined, role: string): Promise<number> {
  if (isAdminRole(role)) return 999;
  if (!dealerId) return DEFAULT_MAX_DEVICES;
  const license = await getDealerModuleLicense(dealerId, LINKSLASH_MODULE_KEY);
  if (!license) return DEFAULT_MAX_DEVICES;
  return parseLicenseMeta(license.metadataJson).maxDevices;
}

export async function countActiveDevices(userId: string): Promise<number> {
  return prisma.linkSlashDevice.count({ where: { userId, status: "active" } });
}

export async function bindDevice(input: {
  userId: string;
  dealerId: string | null | undefined;
  role: string;
  deviceId: string;
  androidId?: string;
  deviceName?: string;
}): Promise<DeviceBindResult> {
  const { userId, dealerId, role, deviceId, androidId = "", deviceName = "Android" } = input;
  if (!deviceId || deviceId.length < 8) {
    return { ok: false, code: "DEVICE_LIMIT", message: "Geçersiz cihaz kimliği" };
  }

  const existing = await prisma.linkSlashDevice.findUnique({
    where: { userId_deviceId: { userId, deviceId } },
  });

  if (existing) {
    if (existing.status === "revoked") {
      return {
        ok: false,
        code: "DEVICE_LIMIT",
        message: "Bu cihaz admin tarafından kaldırılmış. Destek ile iletişime geçin.",
      };
    }
    const updated = await prisma.linkSlashDevice.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date(), androidId: androidId || existing.androidId, deviceName: deviceName || existing.deviceName },
    });
    return { ok: true, device: { id: updated.id, deviceId: updated.deviceId, deviceName: updated.deviceName } };
  }

  const maxDevices = await getMaxDevicesForUser(userId, dealerId, role);
  const activeCount = await countActiveDevices(userId);

  if (activeCount >= maxDevices) {
    const other = await prisma.linkSlashDevice.findFirst({
      where: { userId, status: "active", deviceId: { not: deviceId } },
      orderBy: { lastSeenAt: "desc" },
    });
    return {
      ok: false,
      code: "DEVICE_LIMIT",
      message: "Bu lisans başka bir cihazda aktif.",
      activeDevice: other ? { deviceName: other.deviceName, lastSeenAt: other.lastSeenAt } : undefined,
    };
  }

  const license = dealerId ? await getDealerModuleLicense(dealerId, LINKSLASH_MODULE_KEY) : null;
  const created = await prisma.linkSlashDevice.create({
    data: {
      userId,
      dealerId: dealerId || "",
      deviceId,
      androidId,
      deviceName,
      licenseId: license?.id || "",
      status: "active",
    },
  });

  return { ok: true, device: { id: created.id, deviceId: created.deviceId, deviceName: created.deviceName } };
}

export async function touchDevice(userId: string, deviceId: string): Promise<boolean> {
  const row = await prisma.linkSlashDevice.findUnique({ where: { userId_deviceId: { userId, deviceId } } });
  if (!row || row.status !== "active") return false;
  await prisma.linkSlashDevice.update({ where: { id: row.id }, data: { lastSeenAt: new Date() } });
  return true;
}

export async function listUserDevices(userId: string) {
  return prisma.linkSlashDevice.findMany({ where: { userId }, orderBy: { lastSeenAt: "desc" } });
}

export async function listAllDevices(limit = 100) {
  return prisma.linkSlashDevice.findMany({ orderBy: { lastSeenAt: "desc" }, take: limit });
}

export async function revokeDevice(id: string) {
  return prisma.linkSlashDevice.update({ where: { id }, data: { status: "revoked" } });
}

export async function resetUserDevices(userId: string) {
  return prisma.linkSlashDevice.updateMany({ where: { userId }, data: { status: "revoked" } });
}

export async function deleteDevice(id: string) {
  return prisma.linkSlashDevice.delete({ where: { id } });
}

export async function isDeviceAllowed(userId: string, deviceId: string): Promise<boolean> {
  if (!deviceId) return false;
  const row = await prisma.linkSlashDevice.findUnique({ where: { userId_deviceId: { userId, deviceId } } });
  return !!row && row.status === "active";
}
