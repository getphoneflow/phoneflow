import { defineRelations } from "drizzle-orm"

import { agentsTable, agentVersionsTable } from "@workspace/db/schema/agents"
import {
  account,
  invitation,
  member,
  organization,
  session,
  user,
} from "@workspace/db/schema/auth"
import {
  batchCallRecipientsTable,
  batchCallsTable,
} from "@workspace/db/schema/batch-calls"
import { callsTable } from "@workspace/db/schema/calls"
import { phoneNumbersTable } from "@workspace/db/schema/phone-numbers"

export const relations = defineRelations(
  {
    agentsTable,
    agentVersionsTable,
    batchCallsTable,
    batchCallRecipientsTable,
    callsTable,
    phoneNumbersTable,
    user,
    session,
    account,
    organization,
    member,
    invitation,
  },
  (r) => ({
    agentsTable: {
      organization: r.one.organization({
        from: r.agentsTable.organizationId,
        to: r.organization.id,
      }),
      versions: r.many.agentVersionsTable({
        from: r.agentsTable.id,
        to: r.agentVersionsTable.agentId,
      }),
      phoneNumbers: r.many.phoneNumbersTable({
        from: r.agentsTable.id,
        to: r.phoneNumbersTable.agentId,
      }),
      calls: r.many.callsTable({
        from: r.agentsTable.id,
        to: r.callsTable.agentId,
      }),
      batchCalls: r.many.batchCallsTable({
        from: r.agentsTable.id,
        to: r.batchCallsTable.agentId,
      }),
    },
    agentVersionsTable: {
      agent: r.one.agentsTable({
        from: r.agentVersionsTable.agentId,
        to: r.agentsTable.id,
      }),
      phoneNumbers: r.many.phoneNumbersTable({
        from: r.agentVersionsTable.id,
        to: r.phoneNumbersTable.agentVersionId,
      }),
      calls: r.many.callsTable({
        from: r.agentVersionsTable.id,
        to: r.callsTable.agentVersionId,
      }),
      batchCalls: r.many.batchCallsTable({
        from: r.agentVersionsTable.id,
        to: r.batchCallsTable.agentVersionId,
      }),
    },
    batchCallsTable: {
      organization: r.one.organization({
        from: r.batchCallsTable.organizationId,
        to: r.organization.id,
      }),
      phoneNumber: r.one.phoneNumbersTable({
        from: r.batchCallsTable.phoneNumberId,
        to: r.phoneNumbersTable.id,
      }),
      agent: r.one.agentsTable({
        from: r.batchCallsTable.agentId,
        to: r.agentsTable.id,
      }),
      agentVersion: r.one.agentVersionsTable({
        from: r.batchCallsTable.agentVersionId,
        to: r.agentVersionsTable.id,
      }),
      recipients: r.many.batchCallRecipientsTable({
        from: r.batchCallsTable.id,
        to: r.batchCallRecipientsTable.batchCallId,
      }),
    },
    batchCallRecipientsTable: {
      batchCall: r.one.batchCallsTable({
        from: r.batchCallRecipientsTable.batchCallId,
        to: r.batchCallsTable.id,
      }),
    },
    callsTable: {
      organization: r.one.organization({
        from: r.callsTable.organizationId,
        to: r.organization.id,
      }),
      agent: r.one.agentsTable({
        from: r.callsTable.agentId,
        to: r.agentsTable.id,
      }),
      agentVersion: r.one.agentVersionsTable({
        from: r.callsTable.agentVersionId,
        to: r.agentVersionsTable.id,
      }),
      batchCall: r.one.batchCallsTable({
        from: r.callsTable.batchCallId,
        to: r.batchCallsTable.id,
      }),
    },
    phoneNumbersTable: {
      organization: r.one.organization({
        from: r.phoneNumbersTable.organizationId,
        to: r.organization.id,
      }),
      agent: r.one.agentsTable({
        from: r.phoneNumbersTable.agentId,
        to: r.agentsTable.id,
      }),
      agentVersion: r.one.agentVersionsTable({
        from: r.phoneNumbersTable.agentVersionId,
        to: r.agentVersionsTable.id,
      }),
      batchCalls: r.many.batchCallsTable({
        from: r.phoneNumbersTable.id,
        to: r.batchCallsTable.phoneNumberId,
      }),
    },
    user: {
      sessions: r.many.session({
        from: r.user.id,
        to: r.session.userId,
      }),
      accounts: r.many.account({
        from: r.user.id,
        to: r.account.userId,
      }),
      members: r.many.member({
        from: r.user.id,
        to: r.member.userId,
      }),
    },
    session: {
      user: r.one.user({
        from: r.session.userId,
        to: r.user.id,
      }),
    },
    account: {
      user: r.one.user({
        from: r.account.userId,
        to: r.user.id,
      }),
    },
    organization: {
      members: r.many.member({
        from: r.organization.id,
        to: r.member.organizationId,
      }),
      invitations: r.many.invitation({
        from: r.organization.id,
        to: r.invitation.organizationId,
      }),
      agents: r.many.agentsTable({
        from: r.organization.id,
        to: r.agentsTable.organizationId,
      }),
      phoneNumbers: r.many.phoneNumbersTable({
        from: r.organization.id,
        to: r.phoneNumbersTable.organizationId,
      }),
      calls: r.many.callsTable({
        from: r.organization.id,
        to: r.callsTable.organizationId,
      }),
      batchCalls: r.many.batchCallsTable({
        from: r.organization.id,
        to: r.batchCallsTable.organizationId,
      }),
    },
    member: {
      organization: r.one.organization({
        from: r.member.organizationId,
        to: r.organization.id,
      }),
      user: r.one.user({
        from: r.member.userId,
        to: r.user.id,
      }),
    },
    invitation: {
      organization: r.one.organization({
        from: r.invitation.organizationId,
        to: r.organization.id,
      }),
      inviter: r.one.user({
        from: r.invitation.inviterId,
        to: r.user.id,
      }),
    },
  })
)
