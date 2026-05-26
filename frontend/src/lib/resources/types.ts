/**
 * Shapes for the Assignments & Notes module, mirroring the Express
 * backend's `/api/resources` payloads.
 */

export type ResourceKind = 'assignment' | 'notes';
export type ResourceStatus = 'draft' | 'published';
export type CloudinaryResourceType = 'image' | 'video' | 'raw' | 'auto';

export interface ResourceAttachment {
  _id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  publicId: string;
  resourceType: CloudinaryResourceType;
  format?: string;
  uploadedAt: string;
}

/** Populated reference shape returned by the API. */
export interface PopulatedDivision { _id: string; code: string; name: string; year: 'FE' | 'SE' | 'TE' | 'BE'; branch: string }
export interface PopulatedSubject  { _id: string; code: string; name: string; credits: number; year: 'FE' | 'SE' | 'TE' | 'BE' }
export interface PopulatedTeacher  { _id: string; name: string; email: string }
export interface PopulatedBranch   { _id: string; code: string; name: string }

export interface Resource {
  _id: string;
  kind: ResourceKind;
  status: ResourceStatus;
  division: PopulatedDivision | string;
  subject:  PopulatedSubject  | string;
  teacher:  PopulatedTeacher  | string;
  branch:   PopulatedBranch   | string;
  title: string;
  description: string;
  dueDate?: string;
  maxMarks?: number;
  unit?: string;
  attachments: ResourceAttachment[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}
