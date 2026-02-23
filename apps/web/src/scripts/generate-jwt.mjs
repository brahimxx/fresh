import { SignJWT } from 'jose';

const secret = process.env.JWT_SECRET || 'UJWeTy7Oqbe6vrHPAooIeS2F6MJCGTVD3w6OsGJBQwQ';
const encodedSecret = new TextEncoder().encode(secret);

async function generate() {
  const token = await new SignJWT({ userId: 179, role: 'owner', email: 'owner@fresh.com' })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedSecret);
  
  console.log(token);
}

generate();
