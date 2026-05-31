import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding solar operations database...');

  // 1. Create Default Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'wq-solar' },
    update: {},
    create: {
      nome: 'WQ Solar',
      slug: 'wq-solar',
      ativo: true,
    },
  });
  console.log(`Tenant created/found: ${tenant.nome} (${tenant.id})`);

  // 2. Hash Password for partners
  const passwordHash = await bcrypt.hash('admin123', 10);

  // 3. Create Partner: Rafael
  const userRafael = await prisma.user.upsert({
    where: { email: 'rafael@wqsolar.com' },
    update: {},
    create: {
      email: 'rafael@wqsolar.com',
      nome: 'Rafael',
      senhaHash: passwordHash,
      telefone: '5521959416126', // Rafael's WhatsApp
      role: Role.PARTNER,
      tenantId: tenant.id,
    },
  });

  const socioRafael = await prisma.socio.upsert({
    where: { userId: userRafael.id },
    update: {},
    create: {
      userId: userRafael.id,
      percentualLucro: 50.0,
    },
  });
  console.log(`Sócio Rafael created/found: ${userRafael.nome} (${socioRafael.id})`);

  // 4. Create Partner: Wilson
  const userWilson = await prisma.user.upsert({
    where: { email: 'wilson@wqsolar.com' },
    update: {},
    create: {
      email: 'wilson@wqsolar.com',
      nome: 'Wilson',
      senhaHash: passwordHash,
      telefone: '5521999999999', // Default placeholder for Wilson
      role: Role.PARTNER,
      tenantId: tenant.id,
    },
  });

  const socioWilson = await prisma.socio.upsert({
    where: { userId: userWilson.id },
    update: {},
    create: {
      userId: userWilson.id,
      percentualLucro: 50.0,
    },
  });
  console.log(`Sócio Wilson created/found: ${userWilson.nome} (${socioWilson.id})`);

  // 5. Create Default Employees (Victor & Carlos)
  const workerVictor = await prisma.funcionario.create({
    data: {
      nome: 'Victor',
      telefone: '5521988888888',
      valorDiariaPadrao: 150.00,
      tenantId: tenant.id,
    },
  });
  console.log(`Funcionário Victor created: ${workerVictor.id}`);

  const workerCarlos = await prisma.funcionario.create({
    data: {
      nome: 'Carlos',
      telefone: '5521977777777',
      valorDiariaPadrao: 150.00,
      tenantId: tenant.id,
    },
  });
  console.log(`Funcionário Carlos created: ${workerCarlos.id}`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
