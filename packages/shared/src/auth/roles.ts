import { createAccessControl } from "better-auth/plugins/access"
import {
  defaultStatements,
  ownerAc,
} from "better-auth/plugins/organization/access"

const statement = {
  ...defaultStatements,
  agent: ["create", "read", "update", "delete"],
  phoneNumber: ["create", "read", "update", "delete"],
  calls: ["create", "read"],
  billing: ["purchase"],
  knowledgeBase: ["create", "read", "delete"],
  callExtraction: ["create", "read", "update", "delete"],
  apiKey: ["create", "read", "update", "delete"],
}

export const ac = createAccessControl(statement)

export const owner = ac.newRole({
  ...ownerAc.statements,
  agent: ["create", "read", "update", "delete"],
  phoneNumber: ["create", "read", "update", "delete"],
  calls: ["create", "read"],
  billing: ["purchase"],
  knowledgeBase: ["create", "read", "delete"],
  callExtraction: ["create", "read", "update", "delete"],
  apiKey: ["create", "read", "update", "delete"],
})
