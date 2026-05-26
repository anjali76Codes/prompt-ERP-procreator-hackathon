import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type ResourceKind = 'assignment' | 'notes';
export type ResourceStatus = 'draft' | 'published';
export type CloudinaryResourceType = 'image' | 'video' | 'raw' | 'auto';

export interface ResourceAttachment {
  name: string;            // original filename
  size: number;            // bytes
  mimeType: string;
  url: string;             // Cloudinary secure_url
  publicId: string;        // Cloudinary public_id — needed for destroy
  resourceType: CloudinaryResourceType;
  format?: string;         // e.g. 'pdf', 'png'
  uploadedAt: Date;
}

export interface ResourceDoc extends Document {
  _id: Types.ObjectId;
  kind: ResourceKind;
  status: ResourceStatus;
  division: Types.ObjectId;
  subject: Types.ObjectId;
  teacher: Types.ObjectId;
  branch: Types.ObjectId;
  title: string;
  description: string;
  dueDate?: Date;
  maxMarks?: number;
  unit?: string;
  attachments: ResourceAttachment[];
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<ResourceAttachment>(
  {
    name: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: {
      type: String,
      enum: ['image', 'video', 'raw', 'auto'],
      default: 'raw',
    },
    format: { type: String },
    uploadedAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const resourceSchema = new Schema<ResourceDoc>(
  {
    kind: { type: String, enum: ['assignment', 'notes'], required: true, index: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },

    division: { type: Schema.Types.ObjectId, ref: 'Division', required: true, index: true },
    subject:  { type: Schema.Types.ObjectId, ref: 'Subject',  required: true, index: true },
    teacher:  { type: Schema.Types.ObjectId, ref: 'User',     required: true, index: true },
    branch:   { type: Schema.Types.ObjectId, ref: 'Branch',   required: true, index: true },

    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },

    dueDate:  { type: Date },
    maxMarks: { type: Number, min: 0 },
    unit:     { type: String, trim: true, maxlength: 120 },

    attachments: { type: [attachmentSchema], default: [] },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

// Student feed: { division, subject, status, kind } sorted by publishedAt desc.
resourceSchema.index({ division: 1, subject: 1, status: 1, kind: 1, publishedAt: -1 });
// Teacher's own list, latest first.
resourceSchema.index({ teacher: 1, updatedAt: -1 });

export const Resource: Model<ResourceDoc> = model<ResourceDoc>('Resource', resourceSchema);
