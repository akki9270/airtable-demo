import { Schema, model, Document } from 'mongoose';

export interface IRecord extends Document {
  airtableId: string;
  tableId: string;
  baseId: string;
  fields: Record<string, unknown>;
  createdTime: string;
  userId: string;
  syncedAt: Date;
}

const recordSchema = new Schema<IRecord>(
  {
    airtableId:  { type: String, required: true },
    tableId:     { type: String, required: true },
    baseId:      { type: String, required: true },
    fields:      { type: Schema.Types.Mixed, required: true },
    createdTime: { type: String, required: true },
    userId:      { type: String, required: true },
    syncedAt:    { type: Date,   required: true },
  },
  { collection: 'airtable_records' }
);

recordSchema.index({ airtableId: 1, userId: 1 }, { unique: true });

export const RecordModel = model<IRecord>('Record', recordSchema);
