import { createAccessControl } from "better-auth/plugins/access"
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access"

export const statement = {
  ...defaultStatements,
  agent: ["create", "update", "delete"],
  phoneNumber: ["create", "update", "delete"],
  calls: ["create"],
  billing: ["purchase"],
}

export const ac = createAccessControl(statement)

export const owner = ac.newRole({
  ...ownerAc.statements,
  agent: ["create", "update", "delete"],
  phoneNumber: ["create", "update", "delete"],
  calls: ["create"],
  billing: ["purchase"],
})

export const admin = ac.newRole({
  ...adminAc.statements,
  agent: ["create", "update", "delete"],
  phoneNumber: ["create", "update", "delete"],
  calls: ["create"],
  billing: ["purchase"],
})

export const member = ac.newRole({
  ...memberAc.statements,
  agent: [],
  phoneNumber: [],
  calls: [],
  billing: [],
})

export const roles = { owner, admin, member }

export type RoleKeys = keyof typeof roles
