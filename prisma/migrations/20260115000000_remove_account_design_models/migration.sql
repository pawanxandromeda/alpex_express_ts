-- Migration: remove_account_design_models
-- Safe migration that:
-- 1) Adds JSON columns to PurchaseOrder if missing
-- 2) Copies existing DesignerReview/AccountBill/AccountDispute data into PurchaseOrder.designerActions and PurchaseOrder.accountBills
-- 3) Drops the old tables

BEGIN;

-- 1) Add JSONB columns if not present
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "designerActions" jsonb;
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "accountBills" jsonb;

-- 2) Migrate DesignerReview -> designerActions
-- Build an array of JSON objects for each poId
WITH dr AS (
  SELECT "poId", COALESCE(jsonb_agg(jsonb_build_object(
    'id', "id",
    'employeeId', "employeeId",
    'action', "action",
    'comments', "comments",
    'createdAt', to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ) ORDER BY "createdAt"), '[]'::jsonb) AS actions
  FROM "DesignerReview"
  GROUP BY "poId"
)
UPDATE "PurchaseOrder" po
SET "designerActions" = COALESCE(po."designerActions", '[]'::jsonb) || dr.actions
FROM dr
WHERE po.id = dr."poId";

-- 3) Migrate AccountBill (+ AccountDispute) -> accountBills
WITH disputes AS (
  SELECT "billId", COALESCE(jsonb_agg(jsonb_build_object(
    'id', "id",
    'employeeId', "employeeId",
    'comments', "comments",
    'createdAt', to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ) ORDER BY "createdAt"), '[]'::jsonb) AS disputes
  FROM "AccountDispute"
  GROUP BY "billId"
), bills AS (
  SELECT ab."purchaseOrderId" AS poId, COALESCE(jsonb_agg(jsonb_build_object(
    'id', ab."id",
    'billDate', to_char(ab."billDate", 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'billNo', ab."billNo",
    'partyName', ab."partyName",
    'billAmt', ab."billAmt",
    'receivedAmount', ab."receivedAmount",
    'balanceAmount', ab."balanceAmount",
    'dueDate', to_char(ab."dueDate", 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'pdcAmount', ab."pdcAmount",
    'pdcDate', to_char(ab."pdcDate", 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'chqNo', ab."chqNo",
    'pdcReceiveDate', to_char(ab."pdcReceiveDate", 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'dueDays', ab."dueDays",
    'marketingPersonnelName', ab."marketingPersonnelName",
    'accountsComments', ab."accountsComments",
    'chequesExpected', ab."chequesExpected",
    'remarks', ab."remarks",
    'salesComments', ab."salesComments",
    'createdAt', to_char(ab."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'disputes', COALESCE(d.disputes, '[]'::jsonb)
  ) ORDER BY ab."createdAt"), '[]'::jsonb) AS bills
  FROM "AccountBill" ab
  LEFT JOIN disputes d ON d."billId" = ab."id"
  GROUP BY ab."purchaseOrderId"
)
UPDATE "PurchaseOrder" po
SET "accountBills" = COALESCE(po."accountBills", '[]'::jsonb) || bills.bills
FROM bills
WHERE po.id = bills.poId;

-- 4) Drop old tables (data migrated into JSON fields above)
DROP TABLE IF EXISTS "AccountDispute" CASCADE;
DROP TABLE IF EXISTS "AccountBill" CASCADE;
DROP TABLE IF EXISTS "DesignerReview" CASCADE;

COMMIT;
