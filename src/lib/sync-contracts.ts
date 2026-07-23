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
  fuelLiters: z.coerce.number().nonnegative().optional().default(0),
  fuelItemId: optionalUuidSchema,
  agroItemId: optionalUuidSchema,
  status: z.enum(["PENDING", "IN_TRANSIT", "COMPLETED"]).default("PENDING"),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export const workOrderChemicalItemSchema = z.object({
  inventoryItemId: optionalUuidSchema,
  product: z.string().trim().min(1).max(120),
  quantity: z.coerce.number().nonnegative(),
  unit: z.string().trim().min(1).max(40)
});

export const workOrderSyncRecordSchema = z
  .object({
    id: z.string().uuid(),
    machinery: z.string().trim().min(1).max(120),
    operatorId: optionalUuidSchema,
    operatorName: z.string().trim().min(1).max(120),
    hectaresWorked: z.coerce.number().nonnegative(),
    fuelLiters: z.coerce.number().nonnegative(),
    fuelItemId: optionalUuidSchema,
    plot: optionalTextSchema,
    customer: optionalTextSchema,
    chemicals: z.array(workOrderChemicalItemSchema).optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional()
  });

export const tripSyncPayloadSchema = z.object({
  records: z.array(tripSyncRecordSchema).max(100)
});

export const workOrderSyncPayloadSchema = z.object({
  records: z.array(workOrderSyncRecordSchema).max(100)
});

export type SyncFailure = {
  id: string;
  error: string;
};

export const tripCreateSchema = z.object({
  truck: optionalTextSchema,
  licensePlate: z.string().trim().min(1).max(20),
  driverId: optionalUuidSchema,
  driverName: z.string().trim().min(1).max(120),
  origin: optionalTextSchema,
  destination: optionalTextSchema,
  product: z.string().trim().min(1).max(120),
  estimatedKg: z.coerce.number().int().positive(),
  fuelLiters: z.coerce.number().nonnegative().optional().default(0),
  fuelItemId: optionalUuidSchema,
  agroItemId: optionalUuidSchema,
  status: z.enum(["PENDING", "IN_TRANSIT", "COMPLETED"]).default("PENDING")
});

export const workOrderCreateSchema = z
  .object({
    machinery: z.string().trim().min(1).max(120),
    operatorId: optionalUuidSchema,
    operatorName: z.string().trim().min(1).max(120),
    hectaresWorked: z.coerce.number().nonnegative(),
    fuelLiters: z.coerce.number().nonnegative(),
    fuelItemId: optionalUuidSchema,
    plot: optionalTextSchema,
    customer: optionalTextSchema,
    chemicals: z
      .array(
        z.object({
          inventoryItemId: optionalUuidSchema,
          product: z.string().trim().min(1).max(120),
          quantity: z.coerce.number().nonnegative(),
          unit: z.string().trim().min(1).max(40)
        })
      )
      .optional()
  });

export type TripSyncRecord = z.infer<typeof tripSyncRecordSchema>;
export type WorkOrderSyncRecord = z.infer<typeof workOrderSyncRecordSchema>;

export interface SyncResponse {
  syncedIds: string[];
  failedRecords?: SyncFailure[];
}
