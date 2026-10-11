export interface AttachmentMeta {
  id: string;
  name: string;
  mimeType: string | null;
  type: string | null;
  size: number | null;
  createdAt: Date;
}

export interface AttachmentParent {
  homeworkId?: string | null;
  noteId?: string | null;
  materialId?: string | null;
}
