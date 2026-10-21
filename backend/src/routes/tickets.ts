import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Server } from 'socket.io';
import pool from '../db/pool.js';
import {
  emitTicketCreated,
  emitTicketUpdated,
  emitStockAlert,
  emitFoodCostUpdated,
} from '../sockets/index.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';

// ------------------------------------------------------------------ //
// Validation schemas
// ------------------------------------------------------------------ //

const TICKET_STATUSES = ['QUEUE', 'FIRING', 'COMPLETED', 'CANCELLED'] as const;
type TicketStatus = (typeof TICKET_STATUSES)[number];

const CreateTicketSchema = z.object({
  recipe_id: z.string().uuid(),
  station: z.string().min(1).max(100).optional(),
  table_number: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});


const CreateBatchTicketsSchema = z.object({
  table_number: z.number().int().positive().default(1),
  items: z.array(
    z.object({
      recipe_id: z.string().uuid(),
      station: z.string().min(1).max(100).optional(),
      quantity: z.number().int().positive().default(1),
      notes: z.string().max(500).optional().nullable(),
    })
  ).min(1),
  common_notes: z.string().max(500).optional().nullable(),
});

const PatchTicketStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});

function formatTicket(row: any) {
  return {
    id: row.id,
    organization_id: row.organization_id,
    recipe_id: row.recipe_id,
    recipe_name: row.recipe_name ?? row.menu_item_name,
    station: row.station,
    status: row.status,
    table_number: row.table_number,
    notes: row.notes,
    created_at: row.created_at,
    completed_at: row.completed_at,
    prep_time_minutes: row.prep_time_minutes != null ? Number(row.prep_time_minutes) : 15,
    recipe_price: row.recipe_price != null ? Number(row.recipe_price) : undefined,
  };
}

function resolveOrgId(req: AuthenticatedRequest): string {
  return (
    req.user?.organizationId ||
    (req.headers['x-organization-id'] as string) ||
    '11111111-1111-1111-1111-111111111111'
  );
}

// ------------------------------------------------------------------ //
// Factory: returns a configured router bound to the io instance
// ------------------------------------------------------------------ //
export function createTicketsRouter(io: Server): Router {
  const router = Router();
  router.use(optionalAuth);

  // ---------------------------------------------------------------- //
  // GET /api/tickets — list scoped to caller's organization
  // ---------------------------------------------------------------- //
  router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = resolveOrgId(req);
      const status = req.query['status'] as string | undefined;

      if (status !== undefined && !TICKET_STATUSES.includes(status as TicketStatus)) {
        res.status(400).json({
          error: `status must be one of: ${TICKET_STATUSES.join(', ')}`,
        });
        return;
      }

      const { rows } = status
        ? await pool.query(
            `SELECT lt.id,
                    lt.organization_id,
                    lt.recipe_id,
                    r.menu_item_name AS recipe_name,
                    COALESCE(lt.station, r.station) AS station,
                    lt.status,
                    lt.table_number,
                    lt.notes,
                    lt.created_at,
                    lt.completed_at,
                    r.prep_time_minutes,
                    r.price AS recipe_price
             FROM live_tickets lt
             JOIN recipes r ON r.id = lt.recipe_id
             WHERE lt.organization_id = $1 AND lt.status = $2
             ORDER BY lt.created_at ASC`,
            [orgId, status]
          )
        : await pool.query(
            `SELECT lt.id,
                    lt.organization_id,
                    lt.recipe_id,
                    r.menu_item_name AS recipe_name,
                    COALESCE(lt.station, r.station) AS station,
                    lt.status,
                    lt.table_number,
                    lt.notes,
                    lt.created_at,
                    lt.completed_at,
                    r.prep_time_minutes,
                    r.price AS recipe_price
             FROM live_tickets lt
             JOIN recipes r ON r.id = lt.recipe_id
             WHERE lt.organization_id = $1
             ORDER BY lt.created_at ASC`,
            [orgId]
          );

      res.json(rows.map(formatTicket));
    } catch (err) {
      next(err);
    }
  });

  // ---------------------------------------------------------------- //
  // POST /api/tickets — create and emit socket event to organization
  // ---------------------------------------------------------------- //
  router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = resolveOrgId(req);
      const parsed = CreateTicketSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }

      const { recipe_id, station, table_number, notes } = parsed.data;

      // Verify recipe exists in this organization or globally
      const { rows: recipeCheck } = await pool.query(
        `SELECT id, menu_item_name, station, prep_time_minutes, price FROM recipes WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)`,
        [recipe_id, orgId]
      );
      if (recipeCheck.length === 0) {
        res.status(404).json({ error: 'Recipe not found in this organization' });
        return;
      }

      const finalStation = station || recipeCheck[0].station || 'Main Kitchen';

      const { rows } = await pool.query(
        `INSERT INTO live_tickets (organization_id, recipe_id, station, table_number, notes, status)
         VALUES ($1, $2, $3, $4, $5, 'QUEUE')
         RETURNING *`,
        [orgId, recipe_id, finalStation, table_number ?? 1, notes ?? null]
      );

      const ticket = {
        ...formatTicket(rows[0]),
        recipe_name: recipeCheck[0].menu_item_name,
        station: finalStation,
        prep_time_minutes: recipeCheck[0].prep_time_minutes != null ? Number(recipeCheck[0].prep_time_minutes) : 15,
        recipe_price: recipeCheck[0].price != null ? Number(recipeCheck[0].price) : undefined,
      };

      // Emit scoped to organization room
      emitTicketCreated(io, ticket as any, orgId);

      res.status(201).json(ticket);
    } catch (err) {
      next(err);
    }
  });

  // ---------------------------------------------------------------- //
  // PATCH /api/tickets/:id/status — update status, deduct stock on COMPLETED
  // ---------------------------------------------------------------- //
  
  // ---------------------------------------------------------------- //
  // POST /api/tickets/batch — create multiple tickets for a table
  // ---------------------------------------------------------------- //
  router.post('/batch', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = resolveOrgId(req);
      const parsed = CreateBatchTicketsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }

      const { table_number, items, common_notes } = parsed.data;
      const recipeIds = Array.from(new Set(items.map((i) => i.recipe_id)));

      const { rows: recipeCheck } = await pool.query(
        'SELECT id, menu_item_name, station, prep_time_minutes, price FROM recipes WHERE id = ANY($1::uuid[]) AND (organization_id = $2 OR organization_id IS NULL)',
        [recipeIds, orgId]
      );

      const recipeMap = new Map(recipeCheck.map((r: any) => [r.id, r]));
      const createdTickets: any[] = [];

      for (const item of items) {
        const rec = recipeMap.get(item.recipe_id);
        if (!rec) continue;

        const finalStation = item.station || rec.station || 'Main Kitchen';
        const notes = [item.notes, common_notes].filter(Boolean).join(' | ') || null;
        const qty = item.quantity || 1;

        for (let q = 0; q < qty; q++) {
          const { rows } = await pool.query(
            'INSERT INTO live_tickets (organization_id, recipe_id, station, table_number, notes, status) VALUES ($1, $2, $3, $4, $5, \'QUEUE\') RETURNING *',
            [orgId, item.recipe_id, finalStation, table_number ?? 1, notes]
          );

          const ticket = {
            ...formatTicket(rows[0]),
            recipe_name: rec.menu_item_name,
            station: finalStation,
            prep_time_minutes: rec.prep_time_minutes != null ? Number(rec.prep_time_minutes) : 15,
            recipe_price: rec.price != null ? Number(rec.price) : undefined,
          };

          emitTicketCreated(io, ticket as any, orgId);
          createdTickets.push(ticket);
        }
      }

      res.status(201).json(createdTickets);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const client = await pool.connect();
    try {
      const orgId = resolveOrgId(req);
      const { id } = req.params;

      const parsed = PatchTicketStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }

      const { status } = parsed.data;

      await client.query('BEGIN');

      // Fetch current ticket + recipe details scoped to org
      const { rows: ticketRows } = await client.query(
        `SELECT lt.id, lt.organization_id, lt.recipe_id, lt.status, lt.station, lt.table_number, lt.notes, lt.created_at,
                r.menu_item_name AS recipe_name, r.station AS recipe_station
         FROM live_tickets lt
         JOIN recipes r ON r.id = lt.recipe_id
         WHERE lt.id = $1 AND lt.organization_id = $2
         FOR UPDATE`,
        [id, orgId]
      );

      if (ticketRows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Ticket not found in your organization' });
        return;
      }

      const currentTicket = ticketRows[0];

      // Update the ticket status
      const completedClause = status === 'COMPLETED' ? ', completed_at = NOW()' : '';
      const { rows: updated } = await client.query(
        `UPDATE live_tickets
         SET status = $1 ${completedClause}
         WHERE id = $2 AND organization_id = $3
         RETURNING *`,
        [status, id, orgId]
      );

      // When COMPLETED: deduct ingredients from current_stock and check thresholds
      const stockAlerts: Array<{ ingredient_id: string; name: string; current_stock: number; minimum_threshold: number }> = [];

      if (status === 'COMPLETED' && currentTicket.status !== 'COMPLETED') {
        const { rows: ingredients } = await client.query(
          `SELECT ri.ingredient_id, ri.quantity_required, i.name, i.minimum_threshold
           FROM recipe_ingredients ri
           JOIN ingredients i ON i.id = ri.ingredient_id
           WHERE ri.recipe_id = $1 AND i.organization_id = $2`,
          [currentTicket.recipe_id, orgId]
        );

        for (const ing of ingredients) {
          const { rows: stockRows } = await client.query(
            `UPDATE ingredients
             SET current_stock = GREATEST(current_stock - $1, 0),
                 updated_at = NOW()
             WHERE id = $2 AND organization_id = $3
             RETURNING id, name, current_stock, minimum_threshold`,
            [ing.quantity_required, ing.ingredient_id, orgId]
          );

          const updatedIng = stockRows[0];
          if (updatedIng && Number(updatedIng.current_stock) <= Number(updatedIng.minimum_threshold)) {
            stockAlerts.push({
              ingredient_id: updatedIng.id,
              name: updatedIng.name,
              current_stock: Number(updatedIng.current_stock),
              minimum_threshold: Number(updatedIng.minimum_threshold),
            });
          }
        }
      }

      await client.query('COMMIT');

      const result = {
        ...formatTicket(updated[0]),
        recipe_name: currentTicket.recipe_name,
        station: currentTicket.station || currentTicket.recipe_station,
      };

      // Emit ticket updated to organization room
      emitTicketUpdated(io, result as any, orgId);

      // Fire stock alerts to organization room
      for (const alert of stockAlerts) {
        emitStockAlert(
          io,
          {
            organization_id: orgId,
            ingredient_id: alert.ingredient_id as any,
            name: alert.name,
            stock_qty: alert.current_stock,
            threshold_qty: alert.minimum_threshold,
          },
          orgId
        );
      }

      // If completed, refresh food cost view asynchronously
      if (status === 'COMPLETED') {
        pool.query('REFRESH MATERIALIZED VIEW mv_food_cost_summary')
          .then(() => {
            emitFoodCostUpdated(io, { organization_id: orgId, refreshed_at: new Date() }, orgId);
          })
          .catch(() => {});
      }

      res.json(result);
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  });

  return router;
}
