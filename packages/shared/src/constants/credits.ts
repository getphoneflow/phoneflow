export const CREDIT_PACKS = [
  {
    id: "starter",
    name: "Starter",
    description: "Enough credits to get started",
    credits: 10,
  },
  {
    id: "growth",
    name: "Growth",
    description: "For regular production usage",
    credits: 50,
  },
  {
    id: "scale",
    name: "Scale",
    description: "Best value for high-volume calling",
    credits: 200,
  },
] as const

export type CreditPackId = (typeof CREDIT_PACKS)[number]["id"]

export function getCreditPack(packId: string) {
  return CREDIT_PACKS.find((pack) => pack.id === packId)
}
