import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

const now = new Date();

const users = [
  {
    id: "5dd80b28-5c82-4d4c-a3d7-30d653c3781f",
    name: "Admin Campo",
    email: "admin@agtech.com",
    passwordHash: hashPassword("agtech2025"),
    role: "ADMIN"
  },
  {
    id: "b2d3c53e-8c92-4d7a-b9a0-1e3fdb9f8870",
    name: "Tomás Driver",
    email: "driver@agtech.com",
    passwordHash: hashPassword("driver2025"),
    role: "DRIVER"
  },
  {
    id: "ed18d4b3-4b51-4f43-95a9-4ebd2d527c32",
    name: "Lucía Maquinista",
    email: "maquinista@agtech.com",
    passwordHash: hashPassword("maquinista2025"),
    role: "MACHINE_OPERATOR"
  }
];

const customers = [
  {
    id: "1f7c7d83-6b5f-4f91-95e3-18191d4b0360",
    name: "Agroservicios Norte",
    email: "ventas@agroserviciosnorte.com",
    phone: "341-555-0101",
    address: "Ruta 9 Km 120",
    documentNumber: "30-12345678-9",
    active: true
  },
  {
    id: "f8cf5801-2f69-4b52-a6ec-87aa8171832f",
    name: "Estancia Las Talas",
    email: "operaciones@lastalas.com",
    phone: "341-555-0144",
    address: "Paraje El Chañar",
    documentNumber: "30-87654321-0",
    active: true
  }
];

const machineries = [
  {
    id: "8be32fa8-7c89-4c7c-8dae-7aa2e26e3d8f",
    name: "Pulverizadora Pla MAP II",
    type: "Pulverizadora",
    brand: "Pla",
    identifier: "PLA-002",
    active: true
  },
  {
    id: "d3d98f19-b89e-4fbb-bf6f-8fb9dd0d6c8f",
    name: "Tractor John Deere 7215J",
    type: "Tractor",
    brand: "John Deere",
    identifier: "JD-7215J",
    active: true
  }
];

const inventoryItems = [
  {
    id: "f1a4f5c8-1d65-4a2c-9b9f-9c739e5d3b56",
    name: "Gasoil D12",
    type: "FUEL",
    unit: "L",
    quantity: 6000,
    minQuantity: 500
  },
  {
    id: "e4cd7a46-59bb-4d79-9f8d-1aeee2c7b2b1",
    name: "Herbicida Roundup",
    type: "CHEMICAL",
    unit: "L",
    quantity: 1200,
    minQuantity: 100
  },
  {
    id: "a92d13b0-4bf1-4ea8-86f1-18d3f4a9dd6e",
    name: "Fertilizante NPK",
    type: "CHEMICAL",
    unit: "kg",
    quantity: 800,
    minQuantity: 80
  }
];

const trips = [
  {
    id: "0f54c716-6d07-40dc-b40c-1193bb0f316a",
    truck: "Scania R450",
    licensePlate: "AB123CD",
    driverId: "b2d3c53e-8c92-4d7a-b9a0-1e3fdb9f8870",
    driverName: "Martin Rivas",
    origin: "Campo La Esperanza",
    destination: "Acopio Norte",
    product: "Soja",
    estimatedKg: 31200,
    loadedKg: 30950,
    destinationKg: null,
    fuelLiters: 450,
    fuelItemId: "f1a4f5c8-1d65-4a2c-9b9f-9c739e5d3b56",
    status: "IN_TRANSIT",
    clientCreatedAt: new Date("2026-07-19T12:10:00.000Z"),
    syncedAt: new Date("2026-07-19T12:20:00.000Z")
  },
  {
    id: "4accd38d-ef20-4692-8784-59cbba0d6793",
    truck: "Volvo FH",
    licensePlate: "AE845LP",
    driverId: "b2d3c53e-8c92-4d7a-b9a0-1e3fdb9f8870",
    driverName: "Laura Medina",
    origin: "Lote 8",
    destination: "Puerto Rosario",
    product: "Maiz",
    estimatedKg: 29800,
    loadedKg: null,
    destinationKg: null,
    fuelLiters: 380,
    fuelItemId: "f1a4f5c8-1d65-4a2c-9b9f-9c739e5d3b56",
    status: "PENDING",
    clientCreatedAt: new Date("2026-07-19T11:02:00.000Z"),
    syncedAt: new Date("2026-07-19T11:10:00.000Z")
  }
];

const workOrders = [
  {
    id: "2cefb24a-dc77-412d-a910-e6dd9f7cf15c",
    machineryId: "8be32fa8-7c89-4c7c-8dae-7aa2e26e3d8f",
    machinery: "Pulverizadora Pla MAP II",
    operatorId: "ed18d4b3-4b51-4f43-95a9-4ebd2d527c32",
    operatorName: "Nicolas Duarte",
    initialHourMeter: 1240.5,
    finalHourMeter: 1258.7,
    hectaresWorked: 146,
    fuelLiters: 980,
    fuelItemId: "f1a4f5c8-1d65-4a2c-9b9f-9c739e5d3b56",
    plot: "Lote 12",
    customerId: "1f7c7d83-6b5f-4f91-95e3-18191d4b0360",
    customer: "Agroservicios Norte",
    clientCreatedAt: new Date("2026-07-19T10:20:00.000Z"),
    syncedAt: new Date("2026-07-19T10:35:00.000Z")
  },
  {
    id: "54a81258-b18b-445e-879a-54a9fbe85fc4",
    machineryId: "d3d98f19-b89e-4fbb-bf6f-8fb9dd0d6c8f",
    machinery: "Tractor John Deere 7215J",
    operatorId: "ed18d4b3-4b51-4f43-95a9-4ebd2d527c32",
    operatorName: "Eva Molina",
    initialHourMeter: 821.1,
    finalHourMeter: 833.4,
    hectaresWorked: 82,
    fuelLiters: 720,
    fuelItemId: "f1a4f5c8-1d65-4a2c-9b9f-9c739e5d3b56",
    plot: "Lote 4",
    customerId: "f8cf5801-2f69-4b52-a6ec-87aa8171832f",
    customer: "Estancia Las Talas",
    clientCreatedAt: new Date("2026-07-19T09:30:00.000Z"),
    syncedAt: new Date("2026-07-19T09:50:00.000Z")
  }
];

const workOrderChemicals = [
  {
    id: "cf2d8d2c-fb76-4f8c-9b35-7f944f7cb79a",
    workOrderId: "2cefb24a-dc77-412d-a910-e6dd9f7cf15c",
    inventoryItemId: "e4cd7a46-59bb-4d79-9f8d-1aeee2c7b2b1",
    product: "Herbicida Roundup",
    quantity: 120,
    unit: "L"
  },
  {
    id: "d8b8c7e9-1e09-4fd0-9a73-c9e2b4a1f784",
    workOrderId: "54a81258-b18b-445e-879a-54a9fbe85fc4",
    inventoryItemId: "a92d13b0-4bf1-4ea8-86f1-18d3f4a9dd6e",
    product: "Fertilizante NPK",
    quantity: 180,
    unit: "kg"
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

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: customer,
      create: customer
    });
  }

  for (const machinery of machineries) {
    await prisma.machinery.upsert({
      where: { id: machinery.id },
      update: machinery,
      create: machinery
    });
  }

  for (const inventoryItem of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { id: inventoryItem.id },
      update: inventoryItem,
      create: inventoryItem
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

  for (const chemical of workOrderChemicals) {
    await prisma.workOrderChemical.upsert({
      where: { id: chemical.id },
      update: chemical,
      create: chemical
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
