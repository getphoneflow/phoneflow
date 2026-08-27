import {
  AudioMixing,
  EncodedFileOutput,
  EncodedFileType,
  S3Upload,
  SIPOutboundConfig,
} from "@livekit/protocol"
import {
  AgentDispatchClient,
  EgressClient,
  RoomAgentDispatch,
  RoomConfiguration,
  SipClient,
} from "livekit-server-sdk"

import type { CallVariableValues } from "@workspace/shared/api/calls/types"
import { env } from "@/lib/env"
import { getObject, s3Configured } from "@/lib/s3"

const ROOM_PREFIX = "call-"

function createSipClient() {
  return new SipClient(
    env.LIVEKIT_URL,
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET
  )
}

function createAgentDispatchClient() {
  return new AgentDispatchClient(
    env.LIVEKIT_URL,
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET
  )
}

function createEgressClient() {
  return new EgressClient(
    env.LIVEKIT_URL,
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET
  )
}

export function getRecordingKey(callId: string) {
  return `recordings/${callId}.mp4`
}

export function getRecordingUrl(callId: string) {
  if (!s3Configured()) return null
  return `/api/calls/${callId}/recording`
}

export async function getRecording(callId: string) {
  const { Body } = await getObject(getRecordingKey(callId))
  if (!Body) throw new Error("Recording not found")
  return Body.transformToWebStream()
}

export async function startCallRecording(roomName: string, callId: string) {
  if (!s3Configured()) return

  const egress = createEgressClient()
  await egress.startRoomCompositeEgress(
    roomName,
    {
      file: new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: getRecordingKey(callId),
        disableManifest: true,
        output: {
          case: "s3",
          value: new S3Upload({
            accessKey: env.S3_ACCESS_KEY,
            secret: env.S3_SECRET_KEY,
            bucket: env.S3_BUCKET,
            region: env.S3_REGION,
            endpoint: env.S3_ENDPOINT,
            forcePathStyle: true,
          }),
        },
      }),
    },
    { audioOnly: true, audioMixing: AudioMixing.DUAL_CHANNEL_AGENT }
  )
}

export async function stopCallRecording(roomName: string) {
  if (!s3Configured()) return

  const egress = createEgressClient()
  const active = await egress.listEgress({ roomName, active: true })
  await Promise.all(active.map((item) => egress.stopEgress(item.egressId)))
}

type SipPhoneNumber = {
  number: string
  sipUsername: string | null
  sipPassword: string | null
}

export async function provisionInbound(phoneNumber: SipPhoneNumber) {
  if (!phoneNumber.sipUsername || !phoneNumber.sipPassword) return

  const sip = createSipClient()

  const trunk = await sip.createSipInboundTrunk(phoneNumber.number, [
    phoneNumber.number,
  ])

  await sip.createSipDispatchRule(
    { type: "individual", roomPrefix: ROOM_PREFIX },
    {
      name: phoneNumber.number,
      trunkIds: [trunk.sipTrunkId],
      roomConfig: new RoomConfiguration({
        agents: [
          new RoomAgentDispatch({
            agentName: env.LIVEKIT_AGENT_NAME,
            metadata: JSON.stringify({ direction: "inbound" }),
          }),
        ],
      }),
    }
  )
}

export async function deprovisionInbound(phoneNumber: { number: string }) {
  const sip = createSipClient()

  const trunks = await sip.listSipInboundTrunk({
    numbers: [phoneNumber.number],
  })

  for (const trunk of trunks) {
    const rules = await sip.listSipDispatchRule({
      trunkIds: [trunk.sipTrunkId],
    })
    for (const rule of rules) {
      await sip.deleteSipDispatchRule(rule.sipDispatchRuleId)
    }
    await sip.deleteSipTrunk(trunk.sipTrunkId)
  }
}

export async function clearSipConfig() {
  const sip = createSipClient()

  const dispatchRules = await sip.listSipDispatchRule()
  for (const rule of dispatchRules) {
    await sip.deleteSipDispatchRule(rule.sipDispatchRuleId)
  }

  const inboundTrunks = await sip.listSipInboundTrunk()
  for (const trunk of inboundTrunks) {
    await sip.deleteSipTrunk(trunk.sipTrunkId)
  }

  const outboundTrunks = await sip.listSipOutboundTrunk()
  for (const trunk of outboundTrunks) {
    await sip.deleteSipTrunk(trunk.sipTrunkId)
  }

  return {
    deletedDispatchRules: dispatchRules.length,
    deletedInboundTrunks: inboundTrunks.length,
    deletedOutboundTrunks: outboundTrunks.length,
  }
}

type OutboundCall = {
  agentId: string
  agentVersionId: string | null
  fromNumber: string
  toNumber: string
  sipAddress: string
  sipUsername: string
  sipPassword: string
  variables: CallVariableValues
}

export async function placeOutboundCall(call: OutboundCall) {
  const roomName = `${ROOM_PREFIX}${crypto.randomUUID()}`

  const dispatch = createAgentDispatchClient()
  await dispatch.createDispatch(roomName, env.LIVEKIT_AGENT_NAME, {
    metadata: JSON.stringify({
      direction: "outbound",
      agentId: call.agentId,
      agentVersionId: call.agentVersionId,
      fromNumber: call.fromNumber,
      toNumber: call.toNumber,
    }),
  })

  const sip = createSipClient()
  await sip.createSipParticipant(
    "",
    call.toNumber,
    roomName,
    {
      fromNumber: call.fromNumber,
      participantIdentity: call.toNumber,
      participantAttributes: {
        variable_values: JSON.stringify(call.variables),
      },
    },
    new SIPOutboundConfig({
      hostname: call.sipAddress,
      authUsername: call.sipUsername,
      authPassword: call.sipPassword,
    })
  )
}
