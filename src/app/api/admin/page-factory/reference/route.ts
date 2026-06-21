import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  deleteIndustry,
  deleteIndustryCategory,
  deleteQuestionPattern,
  deleteSearchIntent,
  listIndustryCategories,
  listIndustries,
  listQuestionPatterns,
  listSearchIntents,
  upsertIndustry,
  upsertIndustryCategory,
  upsertQuestionPattern,
  upsertSearchIntent,
} from "@/lib/data-universe/reference-service";

type RefEntity = "industries" | "categories" | "intents" | "question-patterns";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const entity = (searchParams.get("entity") || "industries") as RefEntity;

    const data =
      entity === "categories"
        ? await listIndustryCategories(searchParams)
        : entity === "intents"
          ? await listSearchIntents(searchParams)
          : entity === "question-patterns"
            ? await listQuestionPatterns(searchParams)
            : await listIndustries(searchParams);

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Liste alınamadı";
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const entity = body.entity as RefEntity;

    switch (entity) {
      case "industries":
        return NextResponse.json({ success: true, data: await upsertIndustry(body) });
      case "categories":
        return NextResponse.json({ success: true, data: await upsertIndustryCategory(body) });
      case "intents":
        return NextResponse.json({ success: true, data: await upsertSearchIntent(body) });
      case "question-patterns":
        return NextResponse.json({ success: true, data: await upsertQuestionPattern(body) });
      default:
        return NextResponse.json({ success: false, error: "Geçersiz entity" }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kayıt oluşturulamadı";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity") as RefEntity;
    const id = searchParams.get("id") || "";
    if (!entity || !id) {
      return NextResponse.json({ success: false, error: "entity ve id gerekli" }, { status: 400 });
    }

    if (entity === "industries") await deleteIndustry(id);
    else if (entity === "categories") await deleteIndustryCategory(id);
    else if (entity === "intents") await deleteSearchIntent(id);
    else if (entity === "question-patterns") await deleteQuestionPattern(id);
    else return NextResponse.json({ success: false, error: "Geçersiz entity" }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Silinemedi";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
