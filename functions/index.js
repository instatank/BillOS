"use strict";

// BillBud — scheduled jobs.
//
// 1. autoSettleAutoRenew (00:15 Asia/Kolkata) — auto-renew bills whose due
//    date has passed get marked paid by the system and rolled to the next
//    cycle. Runs BEFORE the reminder job so an auto-renew bill never shows
//    up as "overdue" in the morning push.
// 2. sendBillReminders (08:00 Asia/Kolkata) — for every household, finds
//    active bills that are due within ~48h (or already overdue) and sends ONE
//    digest web-push per opted-in device (devices live at
//    /households/{hid}/reminderDevices/{token} — doc id is the FCM token,
//    written by the client when a member turns on reminders in the ≡ menu).
//    Dead tokens are pruned. No bills due → no push.

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

const SITE_URL = "https://bill-os-phi.vercel.app/";
const WINDOW_MS = 48 * 60 * 60 * 1000; // "due soon" lookahead

// ────────────────────────────────────────────────────────────────────
// Auto-settle for auto-renew bills
//
// A bill on payment mode "auto-renew" is charged by the bank/merchant on
// its own — the member shouldn't have to tap "Mark paid" every cycle. So:
// the bill stays on the line-up right up to its due date (that window is
// the whole point — it's the member's chance to pause / cancel / change
// it), and the DAY AFTER the due date the system marks it paid and rolls
// nextDue to the next cycle.
//
// Rule (mirrored on the client in index.html — keep the two in sync):
//   paymentMode === 'auto-renew'
//   && status === 'active'          (paused/cancelled are never touched)
//   && freq is periodic             (one_time has no next cycle)
//   && nextDue < start of today IST (i.e. strictly before today)
//
// lastPaidAt is stamped with the DUE DATE, not the run date, so a bill due
// 31 Aug that settles on 1 Sep still counts in August's totals.
// ────────────────────────────────────────────────────────────────────

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const PERIODIC_FREQS = ["weekly", "monthly", "quarterly", "yearly"];
// Safety cap on the catch-up loop (a weekly bill left unpaid for a year is
// ~52 cycles). Anything past this is a data problem, not a missed run.
const MAX_CATCHUP_CYCLES = 60;

// Calendar date, in IST, of a millisecond instant. Bills anchor nextDue at
// 09:00 IST (03:30 UTC), but legacy rows may use other anchors — shifting
// by the IST offset and reading UTC parts is correct for any of them.
function istYMD(ms) {
  const d = new Date(ms + IST_OFFSET_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
}
// Back to an instant: 09:00 IST on that date, matching timestampFromYMD()
// in the client.
function ymdToMillis(p) {
  return Date.UTC(p.y, p.m, p.d, 3, 30);
}
function istStartOfTodayMillis() {
  const t = istYMD(Date.now());
  return Date.UTC(t.y, t.m, t.d) - IST_OFFSET_MS;
}
function addMonthsClampedYMD(p, months) {
  const total = p.m + months;
  const y = p.y + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return { y, m, d: Math.min(p.d, lastDay) };
}
function advanceYMD(p, freq) {
  if (freq === "weekly") {
    const t = new Date(Date.UTC(p.y, p.m, p.d));
    t.setUTCDate(t.getUTCDate() + 7);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
  }
  if (freq === "monthly") return addMonthsClampedYMD(p, 1);
  if (freq === "quarterly") return addMonthsClampedYMD(p, 3);
  if (freq === "yearly") return addMonthsClampedYMD(p, 12);
  return null; // one_time — no next cycle
}
function billFreq(b) {
  return b.freq || b.frequency || "monthly";
}
// Is this bill eligible right now? Evaluated against FRESH data inside the
// transaction, so a concurrent pause/cancel/manual-pay wins over the sweep.
function autoSettleEligible(b, todayStartMs) {
  if (!b) return false;
  if (b.paymentMode !== "auto-renew") return false;
  if ((b.status || "active") !== "active") return false;
  if (!PERIODIC_FREQS.includes(billFreq(b))) return false;
  const due = b.nextDue;
  if (!due || typeof due.toMillis !== "function") return false;
  return due.toMillis() < todayStartMs;
}

// Walk nextDue forward until it lands on/after today, so a bill that missed
// several runs catches up in one pass instead of one cycle per day.
// Returns { settledFor, next, cycles } as IST y/m/d parts.
function catchUpFrom(dueMs, freq, todayStartMs) {
  let cur = istYMD(dueMs);
  let settledFor = null;
  let cycles = 0;
  while (ymdToMillis(cur) < todayStartMs && cycles < MAX_CATCHUP_CYCLES) {
    const next = advanceYMD(cur, freq);
    if (!next) break;
    settledFor = cur;
    cur = next;
    cycles++;
  }
  return { settledFor, next: cur, cycles };
}

exports.autoSettleAutoRenew = onSchedule(
  { schedule: "15 0 * * *", timeZone: "Asia/Kolkata" },
  async () => {
    const todayStartMs = istStartOfTodayMillis();
    const cutoff = Timestamp.fromMillis(todayStartMs);

    const households = await db.collection("households").get();
    let settled = 0;
    let skipped = 0;

    for (const h of households.docs) {
      let billsSnap;
      try {
        // Same (status, nextDue) composite index the reminder job uses.
        billsSnap = await h.ref
          .collection("bills")
          .where("status", "==", "active")
          .where("nextDue", "<", cutoff)
          .get();
      } catch (e) {
        logger.error("auto-settle bills query failed for household " + h.id, e);
        continue;
      }

      const candidates = billsSnap.docs.filter((d) =>
        autoSettleEligible(d.data(), todayStartMs)
      );

      for (const c of candidates) {
        try {
          const applied = await db.runTransaction(async (tx) => {
            const snap = await tx.get(c.ref);
            if (!snap.exists) return null;
            const fresh = snap.data();
            // Re-check against fresh state: a member may have paused,
            // cancelled or manually paid this bill since the query.
            if (!autoSettleEligible(fresh, todayStartMs)) return null;

            const freq = billFreq(fresh);
            const { settledFor, next, cycles } = catchUpFrom(
              fresh.nextDue.toMillis(),
              freq,
              todayStartMs
            );
            if (!settledFor || !cycles) return null;

            tx.update(c.ref, {
              lastPaidAt: Timestamp.fromMillis(ymdToMillis(settledFor)),
              lastPaidAmount: Number(fresh.amount) || 0,
              lastPaidNote: null,
              lastPaidAuto: true,
              nextDue: Timestamp.fromMillis(ymdToMillis(next)),
              updatedAt: Timestamp.now(),
              lastModifiedBy: "system",
            });
            return { cycles };
          });
          if (applied) settled++;
          else skipped++;
        } catch (e) {
          logger.error("auto-settle failed", { household: h.id, bill: c.id, err: String(e) });
        }
      }
    }

    logger.info("auto-settle run complete", { settled, skipped });
  }
);

function fmtMoney(amount, cur) {
  const n = Number(amount) || 0;
  if (cur === "USD") {
    const r = Math.round(n * 100) / 100;
    return "$" + (Number.isInteger(r) ? r.toLocaleString("en-US") : r.toFixed(2));
  }
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function buildBody(overdue, upcoming, moneyStr) {
  if (overdue.length && upcoming.length) {
    return `${overdue.length} overdue + ${upcoming.length} due soon · ${moneyStr}`;
  }
  if (overdue.length) {
    return overdue.length === 1
      ? `${overdue[0].name || "A bill"} is overdue · ${moneyStr}`
      : `${overdue.length} bills overdue · ${moneyStr}`;
  }
  return upcoming.length === 1
    ? `${upcoming[0].name || "A bill"} is due soon · ${moneyStr}`
    : `${upcoming.length} bills due soon · ${moneyStr}`;
}

const DEAD_TOKEN_CODES = [
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
];

exports.sendBillReminders = onSchedule(
  { schedule: "0 8 * * *", timeZone: "Asia/Kolkata" },
  async () => {
    const now = Timestamp.now();
    const cutoff = Timestamp.fromMillis(Date.now() + WINDOW_MS);

    const households = await db.collection("households").get();
    let notifiedHouseholds = 0;
    let pushed = 0;
    let pruned = 0;

    for (const h of households.docs) {
      let billsSnap;
      try {
        billsSnap = await h.ref
          .collection("bills")
          .where("status", "==", "active")
          .where("nextDue", "<", cutoff)
          .get();
      } catch (e) {
        logger.error("bills query failed for household " + h.id, e);
        continue;
      }
      if (billsSnap.empty) continue;

      const devSnap = await h.ref.collection("reminderDevices").get();
      if (devSnap.empty) continue;

      const bills = billsSnap.docs
        .map((d) => d.data())
        .filter((b) => b && b.nextDue && typeof b.nextDue.toMillis === "function");
      if (!bills.length) continue;

      const overdue = bills.filter((b) => b.nextDue.toMillis() < now.toMillis());
      const upcoming = bills.filter((b) => b.nextDue.toMillis() >= now.toMillis());

      const byCur = {};
      for (const b of bills) {
        const c = b.currency === "USD" ? "USD" : "INR";
        byCur[c] = (byCur[c] || 0) + (Number(b.amount) || 0);
      }
      const moneyStr = Object.keys(byCur)
        .sort()
        .map((c) => fmtMoney(byCur[c], c))
        .join(" · ");

      const body = buildBody(overdue, upcoming, moneyStr);
      const tokens = devSnap.docs.map((d) => d.id);

      let resp;
      try {
        resp = await getMessaging().sendEachForMulticast({
          tokens,
          notification: { title: "BillBud — bill reminder", body },
          webpush: { fcmOptions: { link: SITE_URL } },
        });
      } catch (e) {
        logger.error("push send failed for household " + h.id, e);
        continue;
      }

      notifiedHouseholds++;
      resp.responses.forEach((r, i) => {
        if (r.success) {
          pushed++;
          return;
        }
        const code = (r.error && r.error.code) || "";
        if (DEAD_TOKEN_CODES.some((c) => code.includes(c))) {
          devSnap.docs[i].ref.delete().catch(() => {});
          pruned++;
        } else {
          logger.warn("push failed", { household: h.id, code });
        }
      });
    }

    logger.info("bill reminders run complete", { notifiedHouseholds, pushed, pruned });
  }
);
