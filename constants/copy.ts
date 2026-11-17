import type { FieldName } from "@/lib/profiles/types";

export const FIELD_LABELS: Record<FieldName, string> = {
  make: "Make",
  model: "Model",
  year: "Model year",
  chassisNumber: "Chassis number (VIN)",
  plate: "Plate number",
  registrationDate: "Registration date",
  engineNumber: "Engine number (optional)",
};

export const COPY = {
  banner: "From your card, please check",
  lowConfidence: "Please check this one",
  okBadge: "Matches the format",
  notFound: "Not found on the card",
  ocrNote: "Read on your device. Less accurate, please check every field.",
  privacy:
    "Your photo is sent to Google's Gemini AI to read it. On the free plan Google may use it to improve its products. We don't keep it. Not comfortable? Try a sample card instead.",
  consent: "I understand",
  sampleButton: "No card? Try a sample",
  pdfBusy: "The AI is busy. Please upload a photo of the card instead.",
  network: "We couldn't reach the server. Check your connection and try again.",
  generic: "Something went wrong. Please try again.",
} as const;

export const UPLOAD_ERRORS: Record<string, string> = {
  missing: "Pick a photo or PDF first.",
  type: "That file type isn't supported. Use a JPG, PNG or WebP photo, or a PDF.",
  heic: "iPhone HEIC photos aren't supported. Take a screenshot of the photo, or share it as JPG.",
  size: "That file is over 4 MB. Try a smaller photo.",
  sample: "That sample isn't available. Pick another one.",
  consent: "Tick “I understand” before uploading your own card.",
};
