export function isAiEnabled(): boolean {
  return process.env.THYRONIX_AI_ENABLED !== "false";
}

export function checkAiLicense() {
  if (!isAiEnabled()) {
    return { error: "THYRONIX AI lisansı aktif değil. Lütfen ENAUNITY panelinden THYRONIX AI modülünü etkinleştirin.", status: 403 };
  }
  return null;
}
