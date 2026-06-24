export type WriterTelemetry = {
  lastGenerationAt: string | null;
  lastError: string | null;
  lastProvider: string | null;
  lastModel: string | null;
  lastWordCount: number | null;
};

const state: WriterTelemetry = {
  lastGenerationAt: null,
  lastError: null,
  lastProvider: null,
  lastModel: null,
  lastWordCount: null,
};

export function recordWriterSuccess(provider: string, model: string, wordCount: number) {
  state.lastGenerationAt = new Date().toISOString();
  state.lastError = null;
  state.lastProvider = provider;
  state.lastModel = model;
  state.lastWordCount = wordCount;
}

export function recordWriterError(error: string) {
  state.lastError = error;
  state.lastGenerationAt = new Date().toISOString();
}

export function getWriterTelemetry(): WriterTelemetry {
  return { ...state };
}
