import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { BaseModel } from '../models/base.model';
import { TableModel } from '../models/table.model';
import { RecordModel } from '../models/record.model';

export const syncRouter = Router();

syncRouter.use(authMiddleware);

// ── POST /api/sync/bases ────────────────────────────────────────────────────

interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: string;
}

syncRouter.post('/bases', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Base sync called');
    const { userId } = req as AuthRequest;
    const items: AirtableBase[] = req.body.items;

    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'items must be an array' });
      return;
    }

    const now = new Date();
    const ops = items.map(item => ({
      updateOne: {
        filter: { airtableId: item.id, userId },
        update: {
          $set:         { name: item.name, permissionLevel: item.permissionLevel, syncedAt: now },
          $setOnInsert: { airtableId: item.id, userId },
        },
        upsert: true,
      },
    }));

    const result = await BaseModel.bulkWrite(ops);
    res.json({ upserted: result.upsertedCount, modified: result.modifiedCount });
  } catch (err) {
    console.error('[Sync] /bases error:', err);
    res.status(500).json({ error: 'Failed to sync bases' });
  }
});

// ── POST /api/sync/tables ───────────────────────────────────────────────────

interface AirtableField { id: string; name: string; type: string; }
interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: AirtableField[];
}

syncRouter.post('/tables', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;
    const { baseId, items }: { baseId: string; items: AirtableTable[] } = req.body;

    if (!baseId || !Array.isArray(items)) {
      res.status(400).json({ error: 'baseId and items are required' });
      return;
    }

    const now = new Date();
    const ops = items.map(item => ({
      updateOne: {
        filter: { airtableId: item.id, userId },
        update: {
          $set:         { name: item.name, primaryFieldId: item.primaryFieldId, fields: item.fields, syncedAt: now },
          $setOnInsert: { airtableId: item.id, baseId, userId },
        },
        upsert: true,
      },
    }));

    const result = await TableModel.bulkWrite(ops);
    res.json({ upserted: result.upsertedCount, modified: result.modifiedCount });
  } catch (err) {
    console.error('[Sync] /tables error:', err);
    res.status(500).json({ error: 'Failed to sync tables' });
  }
});

// ── POST /api/sync/records ──────────────────────────────────────────────────

interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

syncRouter.post('/records', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;
    const { baseId, tableId, items }: { baseId: string; tableId: string; items: AirtableRecord[] } = req.body;

    if (!baseId || !tableId || !Array.isArray(items)) {
      res.status(400).json({ error: 'baseId, tableId and items are required' });
      return;
    }

    const now = new Date();
    const ops = items.map(item => ({
      updateOne: {
        filter: { airtableId: item.id, userId },
        update: {
          $set:         { fields: item.fields, syncedAt: now },
          $setOnInsert: { airtableId: item.id, baseId, tableId, createdTime: item.createdTime, userId },
        },
        upsert: true,
      },
    }));

    const result = await RecordModel.bulkWrite(ops);
    res.json({ upserted: result.upsertedCount, modified: result.modifiedCount });
  } catch (err) {
    console.error('[Sync] /records error:', err);
    res.status(500).json({ error: 'Failed to sync records' });
  }
});
