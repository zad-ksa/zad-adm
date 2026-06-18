import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';

export async function GET() {
  try {
    const hashedPassword = await hash('123456', 10);
    const employee = await prisma.employee.upsert({
      where: { phone: '0500000000' },
      update: { password: hashedPassword },
      create: {
        name: 'مدير النظام',
        phone: '0500000000',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    return NextResponse.json({ 
      success: true, 
      message: 'تم إنشاء حساب الإدارة بنجاح. يمكنك تسجيل الدخول بالبيانات التالية:',
      credentials: {
        phone: employee.phone,
        password: '123456'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
