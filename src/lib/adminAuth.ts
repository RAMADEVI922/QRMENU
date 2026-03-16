/**
 * Custom admin authentication using Firestore.
 * Stores admin credentials in `admins` collection.
 * Passcode is stored as a plain 4-digit string (no sensitive data risk for a local restaurant app).
 */
import {
  collection, getDocs, setDoc, doc, updateDoc, query, where,
} from 'firebase/firestore';
import { db } from './firebase';
import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';
// Separate template for OTP emails
const OTP_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_OTP_TEMPLATE_ID || import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';

const SESSION_KEY = 'adminSession';

export interface AdminRecord {
  id: string;
  email: string;
  passcode: string; // 4-digit
  name: string;
}

function adminsCol() {
  if (!db) throw new Error('Firestore not initialised');
  return collection(db, 'admins');
}

/** Returns true if at least one admin exists */
export async function adminExists(): Promise<boolean> {
  const snap = await getDocs(adminsCol());
  return !snap.empty;
}

/** Create the first admin account */
export async function createAdmin(email: string, passcode: string, name: string): Promise<void> {
  const id = `admin_${Date.now()}`;
  await setDoc(doc(adminsCol(), id), { id, email: email.toLowerCase().trim(), passcode, name });
}

/** Verify email + passcode. Returns admin record on success, null on failure. */
export async function verifyAdmin(email: string, passcode: string): Promise<AdminRecord | null> {
  const q = query(adminsCol(), where('email', '==', email.toLowerCase().trim()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const admin = snap.docs[0].data() as AdminRecord;
  if (admin.passcode !== passcode) return null;
  return admin;
}

/** Save session to localStorage */
export function saveAdminSession(admin: AdminRecord) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id: admin.id, email: admin.email, name: admin.name }));
}

/** Get current session */
export function getAdminSession(): { id: string; email: string; name: string } | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/** Clear session */
export function clearAdminSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ── OTP ──────────────────────────────────────────────────────────────────────

const OTP_STORE_KEY = 'adminOtp';

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

/** Send OTP to email. Returns true if email exists in admins. */
export async function sendOtp(email: string): Promise<boolean> {
  const q = query(adminsCol(), where('email', '==', email.toLowerCase().trim()));
  const snap = await getDocs(q);
  if (snap.empty) return false;

  const otp = generateOtp();
  const expiry = Date.now() + 10 * 60 * 1000; // 10 min
  sessionStorage.setItem(OTP_STORE_KEY, JSON.stringify({ otp, expiry, email: email.toLowerCase().trim() }));

  await emailjs.send(
    SERVICE_ID,
    OTP_TEMPLATE_ID,
    {
      to_email: email,
      otp_code: otp,
      admin_name: (snap.docs[0].data() as AdminRecord).name,
    },
    PUBLIC_KEY
  ).catch((err) => {
    console.error('[AdminOTP] EmailJS error:', JSON.stringify(err));
    throw new Error(`EmailJS: ${err?.text || err?.message || JSON.stringify(err)}`);
  });

  return true;
}

/** Verify OTP entered by user */
export function verifyOtp(inputOtp: string): { valid: boolean; email: string | null } {
  const raw = sessionStorage.getItem(OTP_STORE_KEY);
  if (!raw) return { valid: false, email: null };
  try {
    const { otp, expiry, email } = JSON.parse(raw);
    if (Date.now() > expiry) return { valid: false, email: null };
    if (inputOtp.trim() !== otp) return { valid: false, email: null };
    return { valid: true, email };
  } catch {
    return { valid: false, email: null };
  }
}

/** Update passcode for admin with given email */
export async function updatePasscode(email: string, newPasscode: string): Promise<void> {
  const q = query(adminsCol(), where('email', '==', email.toLowerCase().trim()));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('Admin not found');
  await updateDoc(snap.docs[0].ref, { passcode: newPasscode });
  sessionStorage.removeItem(OTP_STORE_KEY);
}
