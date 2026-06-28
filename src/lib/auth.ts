import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

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

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;
  try {
    const session = await decrypt(sessionCookie);
    
    // Check if user is originally a developer
    const isDeveloper = session.permissions?.includes("developer_mode");
    session.isDeveloper = isDeveloper;
    
    if (isDeveloper) {
      const overrideRole = cookieStore.get("dev_role_override")?.value;
      if (overrideRole && overrideRole !== "DEVELOPER_RESET") {
        session.originalRole = session.role;
        session.role = overrideRole;
        // Strip permissions to perfectly emulate the selected role, 
        // unless they emulate an admin which would normally have permissions
        session.permissions = []; 
      }
    }
    
    return session;
  } catch (error) {
    return null;
  }
}
