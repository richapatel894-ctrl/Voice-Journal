/** Data model for entries and everything attached to them (PRD `docs/PRD.md` §10). */

export type EntryKind = 'voice' | 'text';
export type ProcessingStatus = 'pending' | 'done' | 'failed';
export type TagSource = 'auto' | 'user';
export type AttachmentType = 'photo' | 'video' | 'file' | 'link';
export type SortOrder = 'newest' | 'oldest';

export type EmotionTag = {
  emotion: string;
  /** 0 = primary emotion, used for tight UI spots (a card dot, a thumbnail). */
  position: number;
  valence: number;
  arousal: number;
};

export type ThemeTag = {
  tag: string;
  source: TagSource;
  confidence: number | null;
};

export type Attachment = {
  id: string;
  entryId: string;
  type: AttachmentType;
  /** Path under the app's document directory. Null for links. */
  filePath: string | null;
  thumbnailPath: string | null;
  fileSize: number | null;
  /** Videos only. */
  durationMs: number | null;
  /** Links only. */
  url: string | null;
  title: string | null;
  createdAt: string;
};

export type AudioRecording = {
  entryId: string;
  filePath: string;
  durationMs: number;
  /** Amplitude samples for the player waveform, 0-1 range. */
  waveform: number[];
};

export type Entry = {
  id: string;
  kind: EntryKind;
  createdAt: string;
  text: string;
  transcriptionStatus: ProcessingStatus;
  taggingStatus: ProcessingStatus;
  taggingModel: string | null;
  userEdited: boolean;
  tags: ThemeTag[];
  emotions: EmotionTag[];
  audio: AudioRecording | null;
  attachments: Attachment[];
};

/** Fields a caller supplies when creating an entry; the rest are derived. */
export type NewEntry = {
  id: string;
  kind: EntryKind;
  createdAt: string;
  text: string;
  transcriptionStatus: ProcessingStatus;
};

export type EntryFilter = {
  /** Theme tags to match, combined as OR. */
  themes?: string[];
  /** Emotions to match, combined as AND, and AND-ed with `themes`. */
  emotions?: string[];
  /** Matched against entry text, theme tags and emotion names. */
  search?: string;
  sort?: SortOrder;
};

export type TagCount = {
  tag: string;
  count: number;
};

export type PeriodSummary = {
  period: string;
  text: string;
  generatedAt: string;
};
