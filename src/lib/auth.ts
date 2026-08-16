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

// Session lifetime: 24h, refreshed on every authenticated request via the
// sliding-renewal logic in src/proxy.ts — active users never get logged out
// mid-use, but an abandoned/stolen cookie expires within a day of last use.
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

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
    
    const { prisma } = await import("@/lib/db");
    
    if (session.userType === "CHARITY_USER") {
      const charUser = await prisma.charityUser.findUnique({
        where: { id: session.id },
        select: { permissions: true, title: true, isActive: true }
      });
      if (charUser && charUser.isActive) {
        session.permissions = charUser.permissions;
        session.title = charUser.title;
        return session;
      } else {
        return null; // inactive or deleted
      }
    }
    
    // Employee Logic
    const isDeveloper = session.permissions?.includes("developer_mode");
    session.isDeveloper = isDeveloper;
    
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
        select: { permissions: true, role: true, isActive: true }
      });
      if (emp && emp.isActive) {
        session.permissions = emp.permissions;
        session.role = emp.role;
      } else {
        return null;
      }
    }
    
    return session;
  } catch (error) {
    return null;
  }
});
