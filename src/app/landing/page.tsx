import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import LandingContent from "./LandingContent"

export default async function LandingPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/trainer/dashboard')
  return <LandingContent />
}
