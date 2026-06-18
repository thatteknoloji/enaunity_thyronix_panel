const SMS_API = process.env.SMS_API_URL || "";
const SMS_KEY = process.env.SMS_API_KEY || "";
const SMS_SENDER = process.env.SMS_SENDER || "ENAUNITY";

export async function sendSMS(message: string, phone?: string): Promise<boolean> {
  if (!SMS_API || !SMS_KEY) {
    console.log("[SMS] Config missing — message not sent:", message.slice(0, 50));
    return false;
  }

  try {
    const res = await fetch(SMS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SMS_KEY}`,
      },
      body: JSON.stringify({
        sender: SMS_SENDER,
        message,
        phone: phone || "",
      }),
    });

    if (!res.ok) {
      console.error("[SMS] API error:", await res.text());
      return false;
    }

    return true;
  } catch (e) {
    console.error("[SMS] Send failed:", e);
    return false;
  }
}
