import { redirect } from "next/navigation";

export default async function RegisterPage({ searchParams }) {
  const resolvedParams = await searchParams;
  // Pass any query params along
  if (resolvedParams && Object.keys(resolvedParams).length > 0) {
    const params = new URLSearchParams(resolvedParams);
    redirect(`/login?${params.toString()}`);
  }
  redirect("/login");
}
