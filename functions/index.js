"use strict";

// BillBud — scheduled bill reminders.
//
// Runs daily at 08:00 Asia/Kolkata. For every household, finds active bills
// that are due within ~48h (or already overdue) and sends ONE digest web-push
// per opted-in device (devices live at /households/{hid}/reminderDevices/{token}
// — doc id is the FCM token, written by the client when a member turns on
// reminders in the ≡ menu). Dead tokens are pruned. No bills due → no push.

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

const SITE_URL = "https://bill-os-phi.vercel.app/";
const WINDOW_MS = 48 * 60 * 60 * 1000; // "due soon" lookahead

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
