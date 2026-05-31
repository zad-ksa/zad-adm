import { prisma } from './src/lib/db';
import { hash } from 'bcryptjs';

async function main() {
  const existingAdmin = await prisma.employee.findFirst({
    where: { role: 'ADMIN' }
  });

  if (existingAdmin) {
    console.log('Admin already exists.');
    return;
  }

  const hashedPassword = await hash('admin123', 10);

  const admin = await prisma.employee.create({
    data: {
      name: 'مدير النظام',
      phone: '0500000000',
      password: hashedPassword,
      role: 'ADMIN',
      permissions: ['view_charities', 'edit_charity', 'view_surveys', 'manage_surveys', 'view_reports'],
      isActive: true,
    }
  });

  console.log('Admin created successfully:', admin);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
