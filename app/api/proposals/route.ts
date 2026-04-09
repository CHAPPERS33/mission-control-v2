import { NextResponse } from "next/server";
import {
  dispatchProposal,
  loadProposals,
  normalizeAgent,
  Proposal,
  saveProposals,
} from "@/lib/proposal-dispatch";

export async function GET() {
  const proposals = loadProposals();
  return NextResponse.json({
    data: proposals,
    counts: {
      total: proposals.length,
      pending: proposals.filter(p => p.status === "pending").length,
      approved: proposals.filter(p => p.status === "approved").length,
      rejected: proposals.filter(p => p.status === "rejected").length,
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const proposals = loadProposals();

  if (body.action === "add") {
    const normalizedAgent = normalizeAgent(body.agent || "bert");
    if (!normalizedAgent) {
      return NextResponse.json({ error: `Unknown agent: ${body.agent}` }, { status: 400 });
    }

    const newProposal: Proposal = {
      id: `prop-${Date.now()}`,
      task: body.task || "",
      agent: normalizedAgent,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: body.notes || "",
    };
    proposals.push(newProposal);
    saveProposals(proposals);
    return NextResponse.json({ success: true, data: newProposal });
  }

  if (body.action === "update") {
    const idx = proposals.findIndex(p => p.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const nextStatus = body.updates?.status;
    const updatedAt = new Date().toISOString();
    const nextAgent = body.updates?.agent ? normalizeAgent(body.updates.agent) : proposals[idx].agent;

    if (body.updates?.agent && !nextAgent) {
      return NextResponse.json({ error: `Unknown agent: ${body.updates.agent}` }, { status: 400 });
    }

    const candidate: Proposal = {
      ...proposals[idx],
      ...body.updates,
      agent: nextAgent,
      updatedAt,
    };

    if (nextStatus === "approved" && proposals[idx].status !== "approved") {
      const dispatch = await dispatchProposal(candidate);
      candidate.dispatch = dispatch;
      proposals[idx] = candidate;
      saveProposals(proposals);

      if (dispatch.status !== "sent") {
        return NextResponse.json(
          {
            success: false,
            error: "Approval saved but agent dispatch failed",
            data: proposals[idx],
            dispatch,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        data: proposals[idx],
        dispatch,
      });
    }

    proposals[idx] = candidate;
    saveProposals(proposals);
    return NextResponse.json({ success: true, data: proposals[idx] });
  }

  if (body.action === "delete") {
    const filtered = proposals.filter(p => p.id !== body.id);
    saveProposals(filtered);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
