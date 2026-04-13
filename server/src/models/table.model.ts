import { Schema, model, Document } from 'mongoose';

interface IField {
  id: string;
  name: string;
  type: string;
}

export interface ITable extends Document {
  airtableId: string;
  baseId: string;
  name: string;
  primaryFieldId: string;
  fields: IField[];
  userId: string;
  syncedAt: Date;
}

const fieldSchema = new Schema<IField>(
  {
    id:   { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
  },
  { _id: false }
);

const tableSchema = new Schema<ITable>(
  {
    airtableId:     { type: String,      required: true },
    baseId:         { type: String,      required: true },
    name:           { type: String,      required: true },
    primaryFieldId: { type: String,      required: true },
    fields:         { type: [fieldSchema], default: [] },
    userId:         { type: String,      required: true },
    syncedAt:       { type: Date,        required: true },
  },
  { collection: 'airtable_tables' }
);

tableSchema.index({ airtableId: 1, userId: 1 }, { unique: true });

export const TableModel = model<ITable>('Table', tableSchema);
