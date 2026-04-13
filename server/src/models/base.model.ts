import { Schema, model, Document } from 'mongoose';

export interface IBase extends Document {
  airtableId: string;
  name: string;
  permissionLevel: string;
  userId: string;
  syncedAt: Date;
}

const baseSchema = new Schema<IBase>(
  {
    airtableId:      { type: String, required: true },
    name:            { type: String, required: true },
    permissionLevel: { type: String, required: true },
    userId:          { type: String, required: true },
    syncedAt:        { type: Date,   required: true },
  },
  { collection: 'airtable_bases' }
);

baseSchema.index({ airtableId: 1, userId: 1 }, { unique: true });

export const BaseModel = model<IBase>('Base', baseSchema);
