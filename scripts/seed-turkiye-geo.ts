import { prisma } from "../src/lib/db";
import { toSlug } from "../src/lib/data-universe/pagination";
import { TR_DISTRICTS_BY_PLATE, TR_PROVINCES } from "./data/turkiye-geo";

async function seedTurkiyeGeo() {
  console.log("→ Türkiye GEO evreni…");

  const country = await prisma.geoCountry.upsert({
    where: { code: "TR" },
    create: { code: "TR", name: "Türkiye", isActive: true },
    update: { name: "Türkiye", isActive: true },
  });

  let provinceCount = 0;
  let districtCount = 0;

  for (const p of TR_PROVINCES) {
    const slug = toSlug(p.name);
    const province = await prisma.geoProvince.upsert({
      where: { countryId_slug: { countryId: country.id, slug } },
      create: {
        countryId: country.id,
        plateCode: p.plateCode,
        name: p.name,
        slug,
        isActive: true,
      },
      update: {
        plateCode: p.plateCode,
        name: p.name,
        isActive: true,
      },
    });
    provinceCount += 1;

    const districts = TR_DISTRICTS_BY_PLATE[p.plateCode] || [`${p.name} Merkez`];
    for (const dName of districts) {
      const dSlug = toSlug(dName);
      await prisma.geoDistrict.upsert({
        where: { provinceId_slug: { provinceId: province.id, slug: dSlug } },
        create: {
          provinceId: province.id,
          name: dName,
          slug: dSlug,
          isActive: true,
        },
        update: { name: dName, isActive: true },
      });
      districtCount += 1;
    }
  }

  console.log(`  ✓ ${provinceCount} il, ${districtCount} ilçe yüklendi`);
  console.log("  ℹ Mahalle/köy/sokak katmanları admin CRUD veya bulk import ile genişletilebilir");
}

async function seedReferenceData() {
  console.log("→ Sektör / niyet / soru kalıpları…");

  const industries: Array<{ name: string; categories: string[] }> = [
    { name: "Cam Tablo", categories: ["Modern", "Minimalist", "Klasik", "Ofis", "Salon", "Mutfak"] },
    { name: "Parfüm", categories: ["Kadın", "Erkek", "Unisex", "Niş", "EDP", "EDT"] },
    { name: "Kadın Giyim", categories: ["Elbise", "Bluz", "Pantolon", "Dış Giyim", "Aksesuar"] },
    { name: "Mobilya", categories: ["Salon", "Yatak Odası", "Ofis", "Mutfak", "Bahçe"] },
    { name: "Otel", categories: ["Butik", "Termal", "Balayı", "Deniz", "Spa", "Dağ"] },
    { name: "Gayrimenkul", categories: ["Konut", "Ticari", "Arsa", "Kiralık", "Satılık"] },
  ];

  for (const ind of industries) {
    const slug = toSlug(ind.name);
    const industry = await prisma.industry.upsert({
      where: { slug },
      create: { name: ind.name, slug, description: `${ind.name} sektörü`, isActive: true },
      update: { name: ind.name, isActive: true },
    });
    for (const cat of ind.categories) {
      const catSlug = toSlug(cat);
      await prisma.industryCategory.upsert({
        where: { industryId_slug: { industryId: industry.id, slug: catSlug } },
        create: {
          industryId: industry.id,
          name: cat,
          slug: catSlug,
          description: `${ind.name} — ${cat}`,
          isActive: true,
        },
        update: { name: cat, isActive: true },
      });
    }
    console.log(`  ✓ Sektör: ${ind.name} (${ind.categories.length} kategori)`);
  }

  const intents = [
    "Bilgilendirici",
    "Satın Alma",
    "Ticari",
    "Karşılaştırma",
    "Bayilik",
    "Toptan",
    "Fiyat Araştırması",
    "İnceleme",
    "Yorum",
  ];

  for (const name of intents) {
    const slug = toSlug(name);
    await prisma.searchIntent.upsert({
      where: { slug },
      create: { name, slug, description: `${name} arama niyeti`, isActive: true },
      update: { name, isActive: true },
    });
  }
  console.log(`  ✓ ${intents.length} arama niyeti`);

  const patterns: Array<{ title: string; pattern: string; type: string }> = [
    { title: "Nedir?", pattern: "{topic} nedir?", type: "info" },
    { title: "Nasıl Yapılır?", pattern: "{topic} nasıl yapılır?", type: "howto" },
    { title: "Kaç TL?", pattern: "{topic} kaç TL?", type: "price" },
    { title: "Nereden Alınır?", pattern: "{topic} nereden alınır?", type: "commercial" },
    { title: "Avantajları Nelerdir?", pattern: "{topic} avantajları nelerdir?", type: "info" },
    { title: "Dezavantajları Nelerdir?", pattern: "{topic} dezavantajları nelerdir?", type: "info" },
    { title: "Kimler İçin Uygundur?", pattern: "{topic} kimler için uygundur?", type: "info" },
    { title: "En İyi Seçenekler", pattern: "en iyi {topic} seçenekleri", type: "comparison" },
  ];

  for (const p of patterns) {
    const existing = await prisma.questionPattern.findFirst({ where: { title: p.title, pattern: p.pattern } });
    if (existing) {
      await prisma.questionPattern.update({
        where: { id: existing.id },
        data: { type: p.type, isActive: true },
      });
    } else {
      await prisma.questionPattern.create({ data: { ...p, isActive: true } });
    }
  }
  console.log(`  ✓ ${patterns.length} soru kalıbı`);
}

async function main() {
  await seedTurkiyeGeo();
  await seedReferenceData();
  console.log("\n✓ Data Universe seed tamam");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
