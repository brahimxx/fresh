import { SignJWT } from 'jose';

const secret = process.env.JWT_SECRET || 'UJWeTy7Oqbe6vrHPAooIeS2F6MJCGTVD3w6OsGJBQwQ';
const encodedSecret = new TextEncoder().encode(secret);

async function generate() {
  const token = await new SignJWT({ userId: 1242, role: 'admin', email: 'admin@fresh.com' })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedSecret);
  
  console.log(token);
}

generate();
