import { NextResponse } from "next/server";
import { processReceptionistAI, resolveAppointmentSlot, formatTime12h, findNextDayWithSlot } from "@/lib/services/ai-receptionist";
import { getClinicSettings, saveAppointment, getAppointmentByPhoneAndDate, logMessage, isBusinessPaused, cancelAppointmentById, generateBookingRef } from "@/lib/services/sqlite-store";
import { delay } from "@whiskeysockets/baileys";

const debounceQueue = new Map<string, number>();
const historyStore = new Map<string, { role: string; content: string }[]>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { doctorId, patientPhone, message, jid } = body;

    if (!message || !jid) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const clinicId = doctorId || "default";
    const doctor = getClinicSettings(clinicId);
    if (!doctor.clinic_name) {
      return NextResponse.json({ error: "Clinic is not configured yet." }, { status: 404 });
    }

    // If the business is paused, don't respond
    if (isBusinessPaused(clinicId)) {
      return NextResponse.json({ success: true, paused: true, reply: "" });
    }

    const phone = patientPhone || jid.replace("@s.whatsapp.net", "");

    const historyKey = `${clinicId}-${phone}`;
    const history = historyStore.get(historyKey) || [];
    history.push({ role: "user", content: message });
    if (history.length > 20) history.shift();

    logMessage(clinicId, "incoming", phone, message);

    const aiResult = await processReceptionistAI(message, clinicId, "clinic", history.slice(0, -1));

    let replyText = aiResult.message || "I am currently unable to process your request.";

    if (aiResult.toolCall) {
      const payload = aiResult.toolCall.payload;

      if (aiResult.toolCall.action === "cancelAppointment") {
        const cancelled = cancelAppointmentById(clinicId, payload.reference);
        replyText = cancelled
          ? `Done! Your appointment at ${cancelled.appointment_date} at ${formatTime12h(cancelled.appointment_time)} has been cancelled. ${aiResult.aiMessage || ""}`
          : `I couldn't find an active appointment for reference ${payload.reference}. Could you double-check?`;
        history.push({ role: "assistant", content: replyText });
        historyStore.set(historyKey, history);
        logMessage(clinicId, "outgoing", phone, replyText);
        return NextResponse.json({ success: true, reply: replyText });
      }

      if (aiResult.toolCall.action === "rescheduleAppointment") {
        const cancelled = cancelAppointmentById(clinicId, payload.reference);
        if (!cancelled) {
          replyText = `I couldn't find an active appointment for reference ${payload.reference}. Could you double-check?`;
        } else {
          const newDate = payload.appointmentDate;
          const slot = resolveAppointmentSlot(doctor, clinicId, newDate, payload.appointmentTime);
          if (!slot) {
            const next = findNextDayWithSlot(clinicId, doctor, newDate);
            replyText = next
              ? `I've cancelled your old appointment, but ${newDate} is full. The next available slot is ${next.date} at ${formatTime12h(next.slot)}. Want me to book that?`
              : `I've cancelled your old appointment, but we have no open slots in the coming days. Please call us to arrange something.`;
          } else {
            const ref = generateBookingRef();
            saveAppointment({
              user_id: clinicId,
              patient_name: cancelled.patient_name,
              patient_phone: phone,
              appointment_date: newDate,
              appointment_time: slot,
              age: cancelled.age || "",
              symptoms: cancelled.symptoms || "",
              source: "whatsapp",
              whatsapp_jid: jid,
              booking_ref: ref,
            });
            const refNote = ref.startsWith("APT-") ? ` Your new booking reference is ${ref}.` : "";
            replyText = `All done! Your appointment has been moved to ${newDate} at ${formatTime12h(slot)} at ${doctor.clinic_name}.${refNote} Old appointment cancelled.`;
          }
        }
        history.push({ role: "assistant", content: replyText });
        historyStore.set(historyKey, history);
        logMessage(clinicId, "outgoing", phone, replyText);
        return NextResponse.json({ success: true, reply: replyText });
      }

      const existing = getAppointmentByPhoneAndDate(clinicId, phone, payload.appointmentDate);
      if (existing) {
        replyText = `You already have an appointment booked for ${payload.appointmentDate} at ${doctor.clinic_name}. If you need to reschedule, please let me know.`;
      } else {
        const slot = resolveAppointmentSlot(doctor, clinicId, payload.appointmentDate, payload.appointmentTime);
        if (!slot) {
          const next = findNextDayWithSlot(clinicId, doctor, payload.appointmentDate);
          replyText = next
            ? `I'm sorry, ${payload.appointmentDate} is fully booked. The next available slot is ${next.date} at ${formatTime12h(next.slot)}. Would you like me to book it for you? 😊`
            : `I'm sorry, ${payload.appointmentDate} is unavailable and we have no slots open in the coming days. Please call us directly.`;
        } else {
          const ref = payload.reference || generateBookingRef();
          saveAppointment({
            user_id: clinicId,
            patient_name: payload.patientName,
            patient_phone: phone,
            appointment_date: payload.appointmentDate,
            appointment_time: slot,
            age: payload.patientAge || "",
            symptoms: payload.symptoms,
            source: "whatsapp",
            whatsapp_jid: jid,
            booking_ref: ref,
          });
          const aiTime = payload.appointmentTime;
          const consistent = aiTime && !!formatTime12h(aiTime) && formatTime12h(aiTime) === formatTime12h(slot);
          const refNote = ref.startsWith("APT-") ? ` Your booking reference is ${ref}.` : "";
          replyText = consistent && aiResult.aiMessage
            ? aiResult.aiMessage + refNote
            : `Great news! Your appointment at ${doctor.clinic_name} has been confirmed for ${payload.appointmentDate} at ${formatTime12h(slot)}.${refNote} We'll see you then! 😊`;
        }
      }
    }

    history.push({ role: "assistant", content: replyText });
    historyStore.set(historyKey, history);

    const sock = (global as any).whatsappSessions?.get(doctor.whatsapp_number.replace(/\D/g, "")) || (global as any).whatsappSessions?.get(clinicId);
    if (sock && sock.user) {
      try {
        await sock.sendPresenceUpdate("composing", jid);
        await delay(800);
        await sock.sendPresenceUpdate("paused", jid);
        await sock.sendMessage(jid, { text: replyText });
      } catch (wsErr) {
        console.error("Failed to send WhatsApp message:", wsErr);
      }
    }

    logMessage(clinicId, "outgoing", phone, replyText);

    return NextResponse.json({ success: true, reply: replyText });
  } catch (err: any) {
    console.error("Receptionist Webhook Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
