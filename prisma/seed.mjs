import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const now = new Date();

const users = [
  {
    id: "5dd80b28-5c82-4d4c-a3d7-30d653c3781f",
    name: "Admin Campo",
    email: "admin@agro.local",
    role: "ADMIN"
  },
  {
    id: "ba5dd187-4f96-4472-a908-230d2012317b",
    name: "Martin Rivas",
    email: "martin@campo.local",
    role: "DRIVER"
  },
  {
    id: "4e044138-0669-4914-96aa-6ed5222a63dd",
    name: "Laura Medina",
    email: "laura@campo.local",
    role: "DRIVER"
  },
  {
    id: "1686ea78-359f-420d-81e1-8a2ad4460176",
    name: "Nicolas Duarte",
    email: "nicolas@campo.local",
    role: "MACHINE_OPERATOR"
  },
  {
    id: "42ef8310-aeaf-41a5-8315-9295bdb19533",
    name: "Eva Molina",
    email: "eva@campo.local",
    role: "MACHINE_OPERATOR"
  }
];

const trips = [
  {
    id: "0f54c716-6d07-40dc-b40c-1193bb0f316a",
    truck: "Scania R450",
    licensePlate: "AB123CD",
    driverId: "ba5dd187-4f96-4472-a908-230d2012317b",
    driverName: "Martin Rivas",
    origin: "Campo La Esperanza",
    destination: "Acopio Norte",
    product: "Soja",
    estimatedKg: 31200,
    loadedKg: 30950,
    destinationKg: null,
    status: "IN_TRANSIT",
    clientCreatedAt: new Date("2026-07-19T12:10:00.000Z"),
    syncedAt: new Date("2026-07-19T12:20:00.000Z")
  },
  {
    id: "4accd38d-ef20-4692-8784-59cbba0d6793",
    truck: "Volvo FH",
    licensePlate: "AE845LP",
    driverId: "4e044138-0669-4914-96aa-6ed5222a63dd",
    driverName: "Laura Medina",
    origin: "Lote 8",
    destination: "Puerto Rosario",
    product: "Maiz",
    estimatedKg: 29800,
    loadedKg: null,
    destinationKg: null,
    status: "PENDING",
    clientCreatedAt: new Date("2026-07-19T11:02:00.000Z"),
    syncedAt: new Date("2026-07-19T11:10:00.000Z")
  }
];

const workOrders = [
  {
    id: "2cefb24a-dc77-412d-a910-e6dd9f7cf15c",
    machinery: "Pulverizadora Pla MAP II",
    operatorId: "1686ea78-359f-420d-81e1-8a2ad4460176",
    operatorName: "Nicolas Duarte",
    initialHourMeter: 1240.5,
    finalHourMeter: 1258.7,
    hectaresWorked: 146,
    fuelLiters: 980,
    plot: "Lote 12",
    customer: "Agroservicios Norte",
    clientCreatedAt: new Date("2026-07-19T10:20:00.000Z"),
    syncedAt: new Date("2026-07-19T10:35:00.000Z")
  },
  {
    id: "54a81258-b18b-445e-879a-54a9fbe85fc4",
    machinery: "Tractor John Deere 7215J",
    operatorId: "42ef8310-aeaf-41a5-8315-9295bdb19533",
    operatorName: "Eva Molina",
    initialHourMeter: 821.1,
    finalHourMeter: 833.4,
    hectaresWorked: 82,
    fuelLiters: 720,
    plot: "Lote 4",
    customer: "Estancia Las Talas",
    clientCreatedAt: new Date("2026-07-19T09:30:00.000Z"),
    syncedAt: new Date("2026-07-19T09:50:00.000Z")
  }
];

const syncLogs = [
  {
    id: "7c536763-f2b4-438b-a182-51a93f262490",
    entityType: "TRIP",
    entityId: "0f54c716-6d07-40dc-b40c-1193bb0f316a",
    status: "SUCCESS",
    message: "Carta de porte sincronizada",
    payload: { source: "seed" },
    createdAt: new Date("2026-07-19T12:21:00.000Z")
  },
  {
    id: "856efcf2-0ad3-447a-95df-72a44bbaab41",
    entityType: "WORK_ORDER",
    entityId: "2cefb24a-dc77-412d-a910-e6dd9f7cf15c",
    status: "SUCCESS",
    message: "Parte diario sincronizado",
    payload: { source: "seed" },
    createdAt: new Date("2026-07-19T10:36:00.000Z")
  }
];

async function main() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: user,
      create: user
    });
  }

  for (const trip of trips) {
    await prisma.trip.upsert({
      where: { id: trip.id },
      update: trip,
      create: trip
    });
  }

  for (const workOrder of workOrders) {
    await prisma.workOrder.upsert({
      where: { id: workOrder.id },
      update: workOrder,
      create: workOrder
    });
  }

  for (const syncLog of syncLogs) {
    await prisma.syncLog.upsert({
      where: { id: syncLog.id },
      update: syncLog,
      create: syncLog
    });
  }

  console.log(`Seed completed at ${now.toISOString()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
