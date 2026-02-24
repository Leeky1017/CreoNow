import assert from "node:assert/strict";

import {
  evaluateVisualAuditClosure,
  type Phase4VisualAuditItem,
} from "../../../main/src/services/workbench/phase4-delivery-gate";

// WB-P4-S1: 视觉审计项形成完整闭环并通过验收 [ADDED]
{
  const auditItems: Phase4VisualAuditItem[] = [
    {
      id: "WB-AUDIT-001",
      owner: "ui-owner",
      dueAt: "2026-02-24",
      remediationAction: "adjust command palette spacing",
      retestStatus: "PASS",
      evidenceLink: "https://example.local/evidence/wb-audit-001",
    },
    {
      id: "WB-AUDIT-002",
      owner: "ux-owner",
      dueAt: "2026-02-24",
      remediationAction: "accept tiny icon baseline mismatch",
      retestStatus: "WAIVED",
      waivedApproval: {
        approver: "owner",
        reason: "known low-risk anti-aliasing drift",
      },
      evidenceLink: "https://example.local/evidence/wb-audit-002",
    },
  ];

  const gate = evaluateVisualAuditClosure(auditItems);

  assert.equal(gate.ok, true);
  assert.deepEqual(gate.blockers, []);
}

// WB-P4-S2: 存在未闭环审计项时阻断阶段验收 [ADDED]
{
  const auditItems: Phase4VisualAuditItem[] = [
    {
      id: "WB-AUDIT-003",
      owner: "ui-owner",
      dueAt: "2026-02-24",
      remediationAction: "",
      retestStatus: "FAIL",
      evidenceLink: "https://example.local/evidence/wb-audit-003",
    },
  ];

  const gate = evaluateVisualAuditClosure(auditItems);

  assert.equal(gate.ok, false);
  assert.equal(gate.blockers.some((blocker) => blocker.itemId === "WB-AUDIT-003"), true);
}
