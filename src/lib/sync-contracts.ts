import { z } from "zod";

const optionalUuidSchema = z.string().uuid().optional().nullable();
const optionalTextSchema = z.string().trim().max(160).optional().nullable();

export const tripSyncRecordSchema = z.object({
  id: z.string().uuid(),
  truck: optionalTextSchema,
  licensePlate: z.string().trim().min(1).max(20),
  driverId: optionalUuidSchema,
  driverName: z.string().trim().min(1).max(120),
  origin: optionalTextSchema,
  destination: optionalTextSchema,
  product: z.string().trim().min(1).max(120),
  estimatedKg: z.coerce.number().int().nonnegative(),
  loadedKg: z.coerce.number().int().nonnegative().optional().nullable(),
  destinationKg: z.coerce.number().int().nonnegative().optional().nullable(),
  status: z.enum(["PENDING", "IN_TRANSIT", "COMPLETED"]).default("PENDING"),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export const workOrderSyncRecordSchema = z
  .object({
    id: z.string().uuid(),
    machinery: z.string().trim().min(1).max(120),
    operatorId: optionalUuidSchema,
    operatorName: z.string().trim().min(1).max(120),
    initialHourMeter: z.coerce.number().nonnegative(),
    finalHourMeter: z.coerce.number().nonnegative(),
    hectaresWorked: z.coerce.number().nonnegative(),
    fuelLiters: z.coerce.number().nonnegative(),
    plot: optionalTextSchema,
    customer: optionalTextSchema,
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional()
  })
  .refine((record) => record.finalHourMeter >= record.initialHourMeter, {
    message: "finalHourMeter must be greater than or equal to initialHourMeter",
    path: ["finalHourMeter"]
  });

export const tripSyncPayloadSchema = z.object({
  records: z.array(tripSyncRecordSchema).max(100)
});

export const workOrderSyncPayloadSchema = z.object({
  records: z.array(workOrderSyncRecordSchema).max(100)
});

export type TripSyncRecord = z.infer<typeof tripSyncRecordSchema>;
export type WorkOrderSyncRecord = z.infer<typeof workOrderSyncRecordSchema>;

export interface SyncResponse {
  syncedIds: string[];
}
