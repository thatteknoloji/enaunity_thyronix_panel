import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { requireAdmin, getSession } from "@/lib/auth";
import {
  deleteApkRelease,
  getApkStoragePath,
  listApkReleases,
  setActiveApkRelease,
  statApkFile,
} from "@/lib/linkslash/apk-versions";
import { getApkSourceHints, syncApkFromBuild } from "@/lib/linkslash/apk-sync";

export async function GET() {
  try {
    await requireAdmin();
    const releases = await listApkReleases();
    return NextResponse.json({
      success: true,
      data: releases,
      sources: getApkSourceHints(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sürümler alınamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const session = await getSession();
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const version = String(form.get("version") || "").trim();
    const buildNumber = parseInt(String(form.get("buildNumber") || "1"), 10) || 1;
    const requiredVersion = String(form.get("requiredVersion") || "").trim();
    const setActive = form.get("setActive") === "true";

    if (!file || !version) {
      return NextResponse.json({ success: false, error: "APK dosyası ve sürüm gerekli" }, { status: 400 });
    }
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      return NextResponse.json({ success: false, error: "Sürüm formatı: x.y.z" }, { status: 400 });
    }

    const fileName = `linkslash-v${version}.apk`;
    const storageDir = path.join(process.cwd(), "storage/downloads/linkslash");
    mkdirSync(storageDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    const fsPath = getApkStoragePath(fileName);
    writeFileSync(fsPath, buffer);
    const stat = statApkFile(fsPath);

    const { prisma } = await import("@/lib/db");
    if (setActive) {
      await prisma.linkSlashApkRelease.updateMany({ data: { active: false } });
    }
    const release = await prisma.linkSlashApkRelease.upsert({
      where: { version },
      create: {
        version,
        buildNumber,
        requiredVersion: requiredVersion || version,
        fileName,
        fileSize: stat.size,
        active: setActive,
        uploadedBy: session?.email || session?.id || "admin",
      },
      update: {
        buildNumber,
        requiredVersion: requiredVersion || version,
        fileName,
        fileSize: stat.size,
        active: setActive ? true : undefined,
        uploadedBy: session?.email || session?.id || "admin",
        uploadedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: release });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Yükleme başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json()) as {
      id?: string;
      action?: string;
      requiredVersion?: string;
      version?: string;
      buildNumber?: number;
      setActive?: boolean;
    };
    if (body.action === "activate" && body.id) {
      const release = await setActiveApkRelease(body.id, body.requiredVersion);
      return NextResponse.json({ success: true, data: release });
    }
    if (body.action === "delete" && body.id) {
      await deleteApkRelease(body.id);
      return NextResponse.json({ success: true });
    }
    if (body.action === "sync-from-build") {
      const result = await syncApkFromBuild({
        version: body.version,
        buildNumber: body.buildNumber,
        setActive: body.setActive !== false,
      });
      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: result });
    }
    return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İşlem başarısız";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
