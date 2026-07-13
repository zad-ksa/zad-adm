import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";

function getSecretKey() {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return new TextEncoder().encode(secretKey);
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecretKey());
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, getSecretKey(), {
    algorithms: ["HS256"],
  });
  return payload;
}

export const getSession = cache(async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;
  try {
    const session = await decrypt(sessionCookie);
    
    // Check if user is originally a developer
    const isDeveloper = session.permissions?.includes("developer_mode");
    session.isDeveloper = isDeveloper;
    
    const { prisma } = await import("@/lib/db");
    
    if (isDeveloper) {
      const overrideEmployeeId = cookieStore.get("dev_employee_override")?.value;
      if (overrideEmployeeId && overrideEmployeeId !== "DEVELOPER_RESET") {
        const emp = await prisma.employee.findUnique({
          where: { id: overrideEmployeeId },
          select: { id: true, name: true, role: true, permissions: true, charityId: true, avatarUrl: true }
        });
        
        if (emp) {
          session.originalId = session.id;
          session.originalRole = session.role;
          session.id = emp.id;
          session.name = emp.name;
          session.role = emp.role;
          session.permissions = emp.permissions;
          session.charityId = emp.charityId;
          session.avatarUrl = emp.avatarUrl;
        }
      }
    } else {
      // Sync real employee permissions for regular users dynamically
      const emp = await prisma.employee.findUnique({
        where: { id: session.id },
        select: { permissions: true, role: true }
      });
      if (emp) {
        session.permissions = emp.permissions;
        session.role = emp.role;
      }
    }
    
    return session;
  } catch (error) {
    return null;
  }
});
