import {z} from 'zod';
export const readingSchema=z.object({
  admin_id:z.string().uuid(),from_date:z.iso.date(),to_date:z.iso.date(),
  tickets_counter:z.number().int().nonnegative().nullable(),
  flags_counter:z.number().int().nonnegative().nullable(),
  flags_baseline:z.number().int().nonnegative().nullable().default(null),
  hours:z.number().nonnegative().max(500).nullable(),rating:z.number().min(0).max(5).nullable(),
  note:z.string().max(600).default(''),report_entered_on:z.iso.date().optional()
});
