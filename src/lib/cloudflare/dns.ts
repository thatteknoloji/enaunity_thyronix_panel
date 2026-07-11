const CF_API = "https://api.cloudflare.com/client/v4";

function getAuth() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN env eksik");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function getZoneId() {
  const id = process.env.CLOUDFLARE_ZONE_ID;
  if (!id) throw new Error("CLOUDFLARE_ZONE_ID env eksik");
  return id;
}

export async function createCnameRecord(
  name: string,
  target: string,
  proxied = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${CF_API}/zones/${getZoneId()}/dns_records`, {
      method: "POST",
      headers: getAuth(),
      body: JSON.stringify({
        type: "CNAME",
        name,
        content: target,
        ttl: 1,
        proxied,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      const err = data.errors?.[0]?.message || "Cloudflare hatası";
      return { success: false, error: err };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}

export async function deleteDnsRecord(recordId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${CF_API}/zones/${getZoneId()}/dns_records/${recordId}`, {
      method: "DELETE",
      headers: getAuth(),
    });
    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.errors?.[0]?.message || "Silme hatası" };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}

export async function findDnsRecord(
  name: string,
  type = "CNAME"
): Promise<{ id: string } | null> {
  try {
    const res = await fetch(
      `${CF_API}/zones/${getZoneId()}/dns_records?type=${type}&name=${encodeURIComponent(name)}`,
      { headers: getAuth() }
    );
    const data = await res.json();
    if (data.success && data.result?.[0]) {
      return { id: data.result[0].id };
    }
    return null;
  } catch {
    return null;
  }
}

export async function verifyDomainOwnership(domain: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${CF_API}/zones/${getZoneId()}/dns_records?type=CNAME&name=${encodeURIComponent(domain)}`,
      { headers: getAuth() }
    );
    const data = await res.json();
    if (!data.success) return false;
    const record = data.result?.[0];
    if (!record) return false;
    return record.content?.endsWith(".enaunity.com.tr") || false;
  } catch {
    return false;
  }
}
