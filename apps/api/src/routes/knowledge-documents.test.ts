import { beforeEach, describe, expect, it } from "vitest"

import app from "@/api"
import { knowledgeDocumentsQueue } from "@/lib/queues"
import {
  createOrganization,
  type TestOrganization,
  type TestUser,
} from "@/tests/factories/auth"

describe("knowledge documents", () => {
  let org: TestOrganization
  let admin: TestUser

  beforeEach(async () => {
    org = await createOrganization()
    admin = await org.as("admin")
  })

  it("creates a text document, lists it, and enqueues indexing", async () => {
    const created = await admin.api.post("/api/knowledge-documents", {
      body: { name: "Hours", text: "We are open from 9 to 5." },
    })

    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({
      name: "Hours",
      source: "text",
      status: "pending",
      byteSize: Buffer.byteLength("We are open from 9 to 5."),
    })
    expect(knowledgeDocumentsQueue.add).toHaveBeenCalledWith("index-document", {
      documentId: created.body.id,
    })

    const list = await admin.api.get("/api/knowledge-documents")
    expect(list.body).toEqual([
      expect.objectContaining({ id: created.body.id, name: "Hours" }),
    ])
    expect(list.body[0]).not.toHaveProperty("extractedMarkdown")
  })

  it("does not list or download another organization's documents", async () => {
    const created = await admin.api.post("/api/knowledge-documents", {
      body: { name: "Private", text: "secret hours" },
    })
    const other = await createOrganization()
    const otherAdmin = await other.as("admin")

    const list = await otherAdmin.api.get("/api/knowledge-documents")
    expect(list.body).toEqual([])

    const download = await app.request(
      `/api/knowledge-documents/${created.body.id}/download`,
      { headers: otherAdmin.headers }
    )
    expect(download.status).toBe(404)
  })

  it("downloads pasted text and deletes the document", async () => {
    const created = await admin.api.post("/api/knowledge-documents", {
      body: { name: "Hours", text: "Open 9 to 5" },
    })

    const download = await app.request(
      `/api/knowledge-documents/${created.body.id}/download`,
      { headers: admin.headers }
    )
    expect(download.status).toBe(200)
    expect(download.headers.get("content-type")).toContain("text/plain")
    expect(await download.text()).toBe("Open 9 to 5")

    const deleted = await admin.api.delete(
      `/api/knowledge-documents/${created.body.id}`
    )
    expect(deleted.status).toBe(200)
    expect(knowledgeDocumentsQueue.add).toHaveBeenCalledWith(
      "delete-document",
      {
        documentId: created.body.id,
        organizationId: org.id,
      }
    )

    const list = await admin.api.get("/api/knowledge-documents")
    expect(list.body).toEqual([])
  })

  it("rejects members without the knowledge base permission", async () => {
    const member = await org.as("member")
    const created = await member.api.post("/api/knowledge-documents", {
      body: { name: "Hours", text: "Open 9 to 5" },
    })
    expect(created.status).toBe(403)
  })

  it("rejects an empty document and a file when storage is not configured", async () => {
    const empty = await admin.api.post("/api/knowledge-documents", {
      body: { name: "Hours", text: "  " },
    })
    expect(empty.status).toBe(400)

    const form = new FormData()
    form.set("name", "Notes")
    form.set("file", new File(["# hi"], "notes.md", { type: "text/markdown" }))
    const uploaded = await app.request("/api/knowledge-documents", {
      method: "POST",
      headers: admin.headers,
      body: form,
    })
    expect(uploaded.status).toBe(503)
  })
})
