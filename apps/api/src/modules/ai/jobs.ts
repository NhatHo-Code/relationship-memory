export const INGEST_QUEUE = "memory_ingest";

export interface IngestPayload {
  memoryId: string;
  version: number;
}
