'use client';

import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logFleetActivity } from '@/lib/fleetLogger';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Plus,
  Phone,
  User,
  LogOut,
  Loader2,
  QrCode,
  Download,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  X,
  Bell,
  HelpCircle,
  Settings,
  CreditCard,
  Users,
  LayoutDashboard,
  Link2,
  Pencil,
  Truck,
  ArrowLeft,
  FileText,
  ScrollText,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { PaymentModal } from '@/components/PaymentModal';
import { motion } from 'framer-motion';

interface Profile {
  id: string;
  full_name: string;
  mobile: string;
  is_paid: boolean;
  mobile_verified: boolean;
  avatar_url?: string | null; // storage path in profile-photos bucket
  date_of_birth?: string | null;
  account_type?: string | null;
}

interface Contact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

interface FleetVehicle {
  id: string;
  owner_profile_id: string;
  vehicle_number: string;
  label: string | null;
  make_model: string | null;
  qr_token?: string | null;
  created_at: string;
}

interface FleetDriver {
  id: string;
  owner_profile_id: string;
  name: string;
  phone: string;
  blood_group: string | null;
  notes: string | null;
  assigned_vehicle_id: string | null;
  created_at: string;
}

type PageProps = {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
};

export default function DashboardPage(props: PageProps) {
  if (props.params) React.use(props.params);
  const searchParams = props.searchParams ? React.use(props.searchParams) : {};
  const segmentFromUrl =
    (searchParams?.segment as string | undefined)?.toLowerCase() === 'commercial'
      ? 'commercial'
      : null;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [fleetDrivers, setFleetDrivers] = useState<FleetDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', relation: '', phone: '' });
  const [savingContact, setSavingContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState({ name: '', relation: '', phone: '' });
  const [savingContactEdit, setSavingContactEdit] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpStatus, setOtpStatus] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Saved emergency profile values (used for summaries / scan)
  const [guardianPhone, setGuardianPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [organDonor, setOrganDonor] = useState(false);
  const [languageNote, setLanguageNote] = useState('');
  const [age, setAge] = useState('');
  const [emergencyInstruction, setEmergencyInstruction] = useState('');

  // Form-only state: used to submit, not to display saved values
  const [formGuardianPhone, setFormGuardianPhone] = useState('');
  const [formBloodGroup, setFormBloodGroup] = useState('');
  const [formAllergies, setFormAllergies] = useState('');
  const [formMedicalConditions, setFormMedicalConditions] = useState('');
  const [formMedications, setFormMedications] = useState('');
  const [formOrganDonor, setFormOrganDonor] = useState(false);
  const [formLanguageNote, setFormLanguageNote] = useState('');
  const [formAge, setFormAge] = useState('');
  const [formEmergencyInstruction, setFormEmergencyInstruction] = useState('');
  const [savingEmergencyProfile, setSavingEmergencyProfile] = useState(false);
  const [emergencyStatus, setEmergencyStatus] = useState<string | null>(null);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileInput, setMobileInput] = useState('');
  const [savingMobile, setSavingMobile] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);
  // B2B fleet vehicle modal state
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleLabel, setVehicleLabel] = useState('');
  const [vehicleMakeModel, setVehicleMakeModel] = useState('');
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverBloodGroup, setDriverBloodGroup] = useState('');
  const [driverNotes, setDriverNotes] = useState('');
  const [driverSaving, setDriverSaving] = useState(false);
  const [driverError, setDriverError] = useState<string | null>(null);
  const [expiringDocs, setExpiringDocs] = useState<{ id: string; document_name: string; document_type: string; expiry_date: string; fleet_vehicles: { vehicle_number: string } | null }[]>([]);
  const qrRef = useRef<SVGSVGElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);

    // Fetch profile (including date_of_birth so we can derive age); use maybeSingle so new users without a row don't error
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, mobile, is_paid, mobile_verified, avatar_url, date_of_birth, account_type')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      setLoading(false);
      return;
    }

    // Temporarily disable B2C: treat all accounts as commercial.
    let accountType =
      profileData?.account_type ??
      (user.user_metadata?.account_type as string | undefined) ??
      'commercial';

    // Always persist commercial to the profile row during B2B-only mode.
    if (accountType !== 'commercial' || segmentFromUrl === 'commercial') {
      accountType = 'commercial';
      await supabase
        .from('profiles')
        .update({ account_type: 'commercial' })
        .eq('id', user.id);
    }

    const effectiveProfile: Profile =
      profileData !== null
        ? { ...profileData, account_type: accountType }
        : {
            id: user.id,
            full_name: (user.user_metadata?.full_name as string) || 'User',
            mobile: (user.user_metadata?.mobile as string) || '',
            is_paid: false,
            mobile_verified: false,
            avatar_url: null,
            date_of_birth: null as string | null,
            account_type: accountType,
          };
    setProfile(effectiveProfile);

    if (effectiveProfile.avatar_url) {
      const { data: signed } = await supabase.storage
        .from('profile-photos')
        .createSignedUrl(effectiveProfile.avatar_url, 60 * 60);
      setProfileAvatarUrl(signed?.signedUrl ?? null);
    } else {
      setProfileAvatarUrl(null);
    }

    {
      const profileData = effectiveProfile;

      // Fetch contacts
      const { data: contactsData } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('profile_id', user.id);

      setContacts(contactsData || []);

      // For commercial accounts, fetch fleet vehicles owned by this profile
      if (profileData.account_type === 'commercial') {
        const { data: fleetData, error: fleetError } = await supabase
          .from('fleet_vehicles')
          .select('id, owner_profile_id, vehicle_number, label, make_model, qr_token, created_at')
          .eq('owner_profile_id', user.id)
          .order('created_at', { ascending: false });

        if (fleetError) {
          console.error('Error fetching fleet vehicles:', fleetError);
        }
        setFleetVehicles(fleetData || []);

        // Fetch drivers for this fleet owner
        const { data: driverData, error: driverError } = await supabase
          .from('fleet_drivers')
          .select(
            'id, owner_profile_id, name, phone, blood_group, notes, assigned_vehicle_id, created_at'
          )
          .eq('owner_profile_id', user.id)
          .order('created_at', { ascending: false });

        if (driverError) {
          console.error('Error fetching fleet drivers:', driverError);
        }
        setFleetDrivers(driverData || []);

        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const { data: expiringData } = await supabase
          .from('fleet_documents')
          .select('id, document_name, document_type, expiry_date, fleet_vehicles(vehicle_number)')
          .eq('owner_profile_id', user.id)
          .not('expiry_date', 'is', null)
          .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
          .order('expiry_date', { ascending: true });

        setExpiringDocs(
          (expiringData || []).map((d: Record<string, unknown>) => ({
            id: d.id as string,
            document_name: d.document_name as string,
            document_type: d.document_type as string,
            expiry_date: d.expiry_date as string,
            fleet_vehicles: Array.isArray(d.fleet_vehicles)
              ? (d.fleet_vehicles[0] as { vehicle_number: string } | undefined) ?? null
              : (d.fleet_vehicles as { vehicle_number: string } | null),
          }))
        );
      }

      // Fetch or generate QR token (tolerant of duplicate rows)
      const { data: qrData, error: qrError } = await supabase
        .from('qr_codes')
        .select('token')
        .eq('profile_id', user.id)
        .limit(1)
        .maybeSingle();

      if (qrError && qrError.code !== 'PGRST116') {
        console.error('Error fetching QR code:', qrError);
      }

      if (qrData) {
        setQrToken(qrData.token);
      } else if (profileData.is_paid) {
        // Generate new token if paid but no token exists
        const buf = new Uint8Array(16);
        crypto.getRandomValues(buf);
        const token = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
        await supabase.from('qr_codes').insert({ profile_id: user.id, token });
        setQrToken(token);
      }

      // Fetch emergency profile + medical info + notes
      const [{ data: emergencyProfile }, { data: medicalInfo }, { data: emergencyNote }] =
        await Promise.all([
          supabase
            .from('emergency_profiles')
            .select('*')
            .eq('profile_id', user.id)
            .maybeSingle(),
          supabase
            .from('medical_info')
            .select('*')
            .eq('profile_id', user.id)
            .maybeSingle(),
          supabase
            .from('emergency_notes')
            .select('*')
            .eq('profile_id', user.id)
            .maybeSingle(),
        ]);

      if (emergencyProfile) {
        const guardian = emergencyProfile.guardian_phone || '';
        const blood = emergencyProfile.blood_group || '';
        const lang = emergencyProfile.language_note || '';

        // Prefer age derived from date_of_birth on profile, fall back to stored age
        let ageVal = '';
        if (profileData.date_of_birth) {
          const dob = new Date(profileData.date_of_birth);
          if (!Number.isNaN(dob.getTime())) {
            const today = new Date();
            let years = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
              years--;
            }
            ageVal = String(years);
          }
        }
        if (!ageVal && emergencyProfile.age) {
          ageVal = String(emergencyProfile.age);
        }
        const instruction = emergencyProfile.emergency_instruction || emergencyInstruction;
        const donor = emergencyProfile.organ_donor ?? false;

        // Saved snapshot (for summaries / scan)
        setGuardianPhone(guardian);
        setBloodGroup(blood);
        setLanguageNote(lang);
        setAge(ageVal);
        setEmergencyInstruction(instruction);
        setOrganDonor(donor);

        // Prefill form so user can edit later
        setFormGuardianPhone(guardian);
        setFormBloodGroup(blood);
        setFormLanguageNote(lang);
        setFormAge(ageVal);
        setFormEmergencyInstruction(instruction);
        setFormOrganDonor(donor);
      }

      if (medicalInfo) {
        const allergiesVal = medicalInfo.allergies || '';
        const conditionsVal = medicalInfo.medical_conditions || '';
        const medsVal = medicalInfo.medications || '';

        // Saved snapshot
        setAllergies(allergiesVal);
        setMedicalConditions(conditionsVal);
        setMedications(medsVal);

        // Prefill form
        setFormAllergies(allergiesVal);
        setFormMedicalConditions(conditionsVal);
        setFormMedications(medsVal);
      }

      if (emergencyNote && emergencyNote.note) {
        setEmergencyInstruction(emergencyNote.note);
        setFormEmergencyInstruction(emergencyNote.note);
      }
    }
  } catch (err) {
    console.error('Dashboard fetchData error:', err);
  } finally {
    setLoading(false);
  }
  };

  const handleRequestOtp = async () => {
    if (!profile?.mobile) return;
    setOtpStatus(null);
    setOtpError(null);

    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: profile.mobile }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || 'Failed to request OTP');
        return;
      }

      setOtpRequested(true);
      setOtpStatus('OTP sent to your mobile number.');
    } catch (error) {
      console.error('Request OTP error:', error);
      setOtpError('Something went wrong requesting OTP.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.mobile || !otp) return;

    setOtpStatus(null);
    setOtpError(null);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: profile.mobile, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || 'Failed to verify OTP');
        return;
      }

      setOtpStatus('Mobile number verified successfully.');
      setOtp('');
      // Refresh profile to reflect mobile_verified flag
      await fetchData();
    } catch (error) {
      console.error('Verify OTP error:', error);
      setOtpError('Something went wrong verifying OTP.');
    }
  };

  const handleSaveMobile = async () => {
    if (!mobileInput.trim() || !profile) return;
    setSavingMobile(true);
    setMobileError(null);

    let normalized = mobileInput.trim().replace(/\s+/g, '');
    if (!normalized.startsWith('+91')) {
      normalized = normalized.replace(/^0+/, '');
      normalized = `+91${normalized}`;
    }

    if (normalized.length < 13) {
      setMobileError('Enter a valid 10-digit mobile number.');
      setSavingMobile(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ mobile: normalized })
      .eq('id', profile.id);

    if (error) {
      setMobileError('Failed to save mobile number.');
      console.error('Save mobile error:', error);
    } else {
      setProfile({ ...profile, mobile: normalized });
      setMobileInput('');
    }
    setSavingMobile(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContact(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert({
        profile_id: user?.id,
        ...newContact
      })
      .select()
      .single();

    if (!error && data) {
      const updated = [...contacts, data];
      setContacts(updated);
      setNewContact({ name: '', relation: '', phone: '' });
      // Keep the form open so user can add another contact
      // but close it automatically once the max (3) is reached
      if (updated.length >= 3) {
        setIsAddingContact(false);
      }
    }
    setSavingContact(false);
  };

  const handleStartEditContact = (contact: Contact) => {
    setEditingContactId(contact.id);
    setEditingContact({
      name: contact.name,
      relation: contact.relation,
      phone: contact.phone,
    });
  };

  const handleCancelEditContact = () => {
    setEditingContactId(null);
    setEditingContact({ name: '', relation: '', phone: '' });
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContactId) return;
    setSavingContactEdit(true);

    const { data, error } = await supabase
      .from('emergency_contacts')
      .update({
        name: editingContact.name,
        relation: editingContact.relation,
        phone: editingContact.phone,
      })
      .eq('id', editingContactId)
      .select()
      .single();

    if (!error && data) {
      setContacts((prev) =>
        prev.map((c) => (c.id === editingContactId ? (data as Contact) : c))
      );
      setEditingContactId(null);
      setEditingContact({ name: '', relation: '', phone: '' });
    }

    setSavingContactEdit(false);
  };

  const handleDeleteContact = async (id: string) => {
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', id);

    if (!error) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      if (editingContactId === id) {
        handleCancelEditContact();
      }
    }
  };

  const handlePayment = () => {
    if (!userId) return;
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = async () => {
    // Activation + payment are handled inside the PaymentModal via /api/activate.
    // After activation, for fleet (commercial) accounts we also bulk-generate
    // vehicle QRs so HR does not need to click "Generate QR" per vehicle.
    await fetchData();
    await ensureFleetVehicleQrs();
    setIsPaymentOpen(false);
  };

  const handleSaveEmergencyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !profile) return;

    setEmergencyStatus(null);
    setEmergencyError(null);
    setSavingEmergencyProfile(true);

    try {
      const parsedAge = formAge ? parseInt(formAge, 10) : null;

      // Backend tables have NOT NULL constraints for some fields.
      // To avoid save failures when user leaves them blank, send a safe placeholder.
      const safeAllergies =
        formAllergies.trim() === '' ? 'Not specified' : formAllergies;
      const safeMedicalConditions =
        formMedicalConditions.trim() === '' ? 'Not specified' : formMedicalConditions;
      const safeEmergencyInstruction =
        formEmergencyInstruction.trim() === ''
          ? 'Not specified'
          : formEmergencyInstruction;

      const [{ error: epError }, { error: miError }, { error: noteError }] =
        await Promise.all([
          supabase
            .from('emergency_profiles')
            .upsert(
              {
                profile_id: profile.id,
                blood_group: formBloodGroup.toUpperCase(),
                guardian_phone: formGuardianPhone,
                emergency_instruction: safeEmergencyInstruction,
                organ_donor: formOrganDonor,
                language_note: formLanguageNote,
                age: parsedAge,
              },
              { onConflict: 'profile_id' }
            ),
          supabase
            .from('medical_info')
            .upsert(
              {
                profile_id: profile.id,
                allergies: safeAllergies,
                medical_conditions: safeMedicalConditions,
                medications: formMedications,
              },
              { onConflict: 'profile_id' }
            ),
          supabase
            .from('emergency_notes')
            .upsert(
              {
                profile_id: profile.id,
                note: safeEmergencyInstruction,
              },
              { onConflict: 'profile_id' }
            ),
        ]);

      if (epError || miError || noteError) {
        console.error('Emergency profile save errors:', { epError, miError, noteError });
        setEmergencyError('Failed to save emergency profile. Please try again.');
      } else {
        // Update saved snapshot used in summaries
        setGuardianPhone(formGuardianPhone);
        setBloodGroup(formBloodGroup.toUpperCase());
        setLanguageNote(formLanguageNote);
        setAge(formAge);
        setEmergencyInstruction(safeEmergencyInstruction);
        setOrganDonor(formOrganDonor);
        setAllergies(safeAllergies);
        setMedicalConditions(safeMedicalConditions);
        setMedications(formMedications);

        // Keep form values so user can edit / delete later.
        setEmergencyStatus('Emergency profile saved successfully.');
      }
    } catch (error) {
      console.error('Save emergency profile error:', error);
      setEmergencyError('Something went wrong while saving.');
    } finally {
      setSavingEmergencyProfile(false);
    }
  };

  const downloadQrFromInlineSvg = () => {
    if (typeof document === 'undefined') return;
    if (!qrRef.current) return;

    try {
      const svgElement = qrRef.current;
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);

      const blob = new Blob([svgString], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);

      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          return;
        }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        canvas.toBlob((pngBlob) => {
          if (!pngBlob) return;
          const pngUrl = URL.createObjectURL(pngBlob);
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = 'rexu-qr.png';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(pngUrl);
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (err) {
      console.error('Failed to export QR from inline SVG:', err);
    }
  };

  const handleDownloadQR = async () => {
    if (!qrToken) {
      console.error('QR download requested but qrToken is missing');
      return;
    }

    try {
      const res = await fetch(`/api/qr/${qrToken}`);
      if (!res.ok) {
        // If the storage-backed PNG is missing (e.g. QR not yet uploaded),
        // fall back to downloading the on-screen SVG version instead.
        const errorText = await res.text();
        console.error('QR download API error', errorText);
        downloadQrFromInlineSvg();
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rexu-qr.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download QR via API:', err);
      // As a safety net, attempt client-side export if the API path fails.
      downloadQrFromInlineSvg();
    }
  };

  const ensureFleetVehicleQrs = async () => {
    // Only relevant for B2B / commercial accounts
    if (profile?.account_type !== 'commercial') return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        console.error('ensureFleetVehicleQrs: no active session');
        return;
      }

      const res = await fetch('/api/fleet/generate-all-vehicle-qrs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to bulk-generate fleet vehicle QRs:', data.error);
        return;
      }

      if (!Array.isArray(data.vehicles)) return;

      const tokensById = new Map<string, string>();
      for (const v of data.vehicles as { id: string; token: string }[]) {
        tokensById.set(v.id, v.token);
      }

      if (tokensById.size === 0) return;

      setFleetVehicles((prev) =>
        prev.map((vehicle) =>
          tokensById.has(vehicle.id)
            ? { ...vehicle, qr_token: tokensById.get(vehicle.id) ?? vehicle.qr_token }
            : vehicle
        )
      );
    } catch (err) {
      console.error('ensureFleetVehicleQrs client error:', err);
    }
  };

  const handleGenerateVehicleQr = async (vehicleId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        console.error('generateVehicleQr: no active session');
        return;
      }

      const res = await fetch('/api/fleet/generate-vehicle-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ vehicleId }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to generate vehicle QR:', data.error);
        return;
      }
      if (!data.token) return;

      // Update local state so UI reflects the new QR token
      setFleetVehicles((prev) =>
        prev.map((v) => (v.id === vehicleId ? { ...v, qr_token: data.token } : v))
      );
    } catch (err) {
      console.error('generateVehicleQr client error:', err);
    }
  };

  const handleDownloadVehicleQr = async (token: string) => {
    try {
      const res = await fetch(`/api/qr/${token}`);
      if (!res.ok) {
        console.error('Vehicle QR download API error', await res.text());
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rexu-vehicle-qr.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download vehicle QR:', err);
    }
  };

  const scrollToEmergencyProfile = () => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('emergency-profile');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setVehicleError(null);

    if (!profile?.id) {
      setVehicleError('Profile not loaded. Please refresh the page.');
      return;
    }
    if (!vehicleNumber.trim()) {
      setVehicleError('Vehicle number is required.');
      return;
    }

    setVehicleSaving(true);
    try {
      // Requires a `fleet_vehicles` table with at least:
      // owner_profile_id (uuid), vehicle_number (text), label (text), make_model (text).
      const { error } = await supabase.from('fleet_vehicles').insert({
        owner_profile_id: profile.id,
        vehicle_number: vehicleNumber.trim(),
        label: vehicleLabel.trim() || null,
        make_model: vehicleMakeModel.trim() || null,
      });

      if (error) {
        console.error('Failed to create fleet vehicle:', error);
        setVehicleError(error.message ?? 'Failed to save vehicle.');
        return;
      }

      await logFleetActivity({
        action: 'vehicle_added',
        entityType: 'vehicle',
        description: `Added vehicle ${vehicleNumber.trim()}${vehicleLabel.trim() ? ` (${vehicleLabel.trim()})` : ''}`,
        metadata: { vehicle_number: vehicleNumber.trim(), label: vehicleLabel.trim() || null, make_model: vehicleMakeModel.trim() || null },
      });

      setVehicleNumber('');
      setVehicleLabel('');
      setVehicleMakeModel('');
      setIsVehicleModalOpen(false);
    } catch (err) {
      console.error('Create vehicle error:', err);
      setVehicleError(
        err instanceof Error ? err.message : 'Something went wrong while saving vehicle.'
      );
    } finally {
      setVehicleSaving(false);
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setDriverError(null);

    if (!profile?.id) {
      setDriverError('Profile not loaded. Please refresh the page.');
      return;
    }
    if (!driverName.trim() || !driverPhone.trim()) {
      setDriverError('Driver name and phone are required.');
      return;
    }

    setDriverSaving(true);
    try {
      const { data, error } = await supabase
        .from('fleet_drivers')
        .insert({
          owner_profile_id: profile.id,
          name: driverName.trim(),
          phone: driverPhone.trim(),
          blood_group: driverBloodGroup.trim() || null,
          notes: driverNotes.trim() || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create driver:', error);
        setDriverError(error.message ?? 'Failed to save driver.');
        return;
      }

      setFleetDrivers((prev) => [data as FleetDriver, ...prev]);

      await logFleetActivity({
        action: 'driver_added',
        entityType: 'driver',
        entityId: data.id,
        description: `Added driver ${driverName.trim()} (${driverPhone.trim()})`,
        metadata: { name: driverName.trim(), phone: driverPhone.trim(), blood_group: driverBloodGroup.trim() || null },
      });

      setDriverName('');
      setDriverPhone('');
      setDriverBloodGroup('');
      setDriverNotes('');
      setIsDriverModalOpen(false);
    } catch (err) {
      console.error('Create driver error:', err);
      setDriverError(err instanceof Error ? err.message : 'Something went wrong while saving.');
    } finally {
      setDriverSaving(false);
    }
  };

  const handleAssignDriver = async (driverId: string, vehicleId: string | null) => {
    try {
      const { data, error } = await supabase
        .from('fleet_drivers')
        .update({ assigned_vehicle_id: vehicleId })
        .eq('id', driverId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update driver assignment:', error);
        return;
      }

      setFleetDrivers((prev) =>
        prev.map((d) => (d.id === driverId ? (data as FleetDriver) : d))
      );

      const driverObj = fleetDrivers.find((d) => d.id === driverId);
      const vehicleObj = vehicleId ? fleetVehicles.find((v) => v.id === vehicleId) : null;
      await logFleetActivity({
        action: vehicleId ? 'driver_assigned' : 'driver_unassigned',
        entityType: 'driver',
        entityId: driverId,
        description: vehicleId
          ? `Assigned ${driverObj?.name || 'driver'} to ${vehicleObj?.vehicle_number || 'vehicle'}`
          : `Unassigned ${driverObj?.name || 'driver'} from vehicle`,
      });
    } catch (err) {
      console.error('Update driver assignment error:', err);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        'Are you sure you would like to delete this driver? This will remove their assignments as well.'
      );
      if (!ok) return;
    }

    try {
      const { error } = await supabase.from('fleet_drivers').delete().eq('id', driverId);
      if (error) {
        console.error('Failed to delete driver:', error);
        return;
      }

      const deletedDriver = fleetDrivers.find((d) => d.id === driverId);
      setFleetDrivers((prev) => prev.filter((d) => d.id !== driverId));

      await logFleetActivity({
        action: 'driver_deleted',
        entityType: 'driver',
        entityId: driverId,
        description: `Deleted driver ${deletedDriver?.name || 'unknown'}`,
      });
    } catch (err) {
      console.error('Delete driver error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#6eb84a]" />
          <p className="text-sm text-neutral-500 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const sectionVariants = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.33, 1, 0.68, 1] as [number, number, number, number] } } };

  // B2B / commercial dashboard – separate interface for fleet owners.
  if (profile?.account_type === 'commercial') {
    const activeQrCount = fleetVehicles.filter((v) => v.qr_token).length;

    return (
      <div className="min-h-screen flex bg-neutral-50 bg-rexu-grid">
        {/* ── Sidebar ── */}
        <aside className="hidden md:flex w-[240px] shrink-0 border-r border-neutral-200 flex-col bg-white sticky top-0 h-screen overflow-y-auto shadow-sm">
          {/* Logo / profile */}
          <div className="px-5 pt-6 pb-5 flex flex-col items-center text-center border-b border-neutral-100">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="self-start mb-4 w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-14 h-14 rounded-full mb-3 overflow-hidden border-2 border-[#89d957]/40 bg-neutral-100 flex items-center justify-center">
              {profileAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileAvatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Image src="/rexu-logo.png" alt="Rexu" width={56} height={56} className="rounded-full" />
              )}
            </div>
            <h2 className="font-bold text-sm text-neutral-900">{profile?.full_name || 'Rexu'}</h2>
            <p className="text-[11px] text-[#6eb84a] font-semibold uppercase tracking-widest mt-0.5">Fleet Account</p>
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Edit Profile
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-5 space-y-0.5 px-3">
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              Fleet Management
            </p>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-[#6eb84a] bg-[#89d957]/10 rounded-xl border-l-[3px] border-[#6eb84a]"
            >
              <LayoutDashboard className="w-4 h-4" /> Fleet Dashboard
            </Link>
            <Link
              href="/fleet"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 rounded-xl border-l-[3px] border-transparent transition-colors"
            >
              <Truck className="w-4 h-4" /> Manage Vehicles
            </Link>
            <Link
              href="/drivers"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 rounded-xl border-l-[3px] border-transparent transition-colors"
            >
              <Users className="w-4 h-4" /> Manage Drivers
            </Link>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('assignments-section');
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 rounded-xl border-l-[3px] border-transparent transition-colors"
            >
              <Link2 className="w-4 h-4" /> Assignments
            </button>

            <p className="px-3 mt-6 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              Operations
            </p>
            <Link
              href="/documents"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 rounded-xl border-l-[3px] border-transparent transition-colors"
            >
              <FileText className="w-4 h-4" /> Documents
              {expiringDocs.length > 0 && (
                <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5 leading-none">
                  {expiringDocs.length}
                </span>
              )}
            </Link>
            <Link
              href="/logs"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 rounded-xl border-l-[3px] border-transparent transition-colors"
            >
              <ScrollText className="w-4 h-4" /> Activity Logs
            </Link>

            <p className="px-3 mt-6 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              Account
            </p>
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 rounded-xl border-l-[3px] border-transparent transition-colors"
            >
              <Settings className="w-4 h-4" /> Settings
            </Link>
            <Link
              href="/security"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 rounded-xl border-l-[3px] border-transparent transition-colors"
            >
              <Shield className="w-4 h-4" /> Security
            </Link>
            <button
              type="button"
              onClick={handlePayment}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 rounded-xl border-l-[3px] border-transparent transition-colors"
            >
              <CreditCard className="w-4 h-4" /> Billing &amp; Plans
            </button>
          </nav>

          {/* Bottom */}
          <div className="border-t border-neutral-100 px-5 py-4 space-y-3">
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <HelpCircle className="w-4 h-4" /> Help &amp; Support
            </button>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/login');
              }}
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-red-500 transition-colors w-full"
            >
              <span className="w-6 h-6 rounded-full bg-gradient-brand text-[#1a2e0f] flex items-center justify-center text-[10px] font-bold shrink-0">
                {profile?.full_name?.[0]?.toUpperCase() || 'U'}
              </span>
              Logout
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top header bar */}
          <header className="h-16 shrink-0 border-b border-neutral-200 flex items-center justify-between px-8 bg-white sticky top-0 z-10 shadow-sm">
            <div>
              <h1 className="text-lg font-bold text-neutral-900 leading-tight">
                Fleet Dashboard
              </h1>
              <p className="text-xs text-neutral-500">Vehicles &amp; Drivers</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <Bell className="w-5 h-5 text-neutral-400" />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  className="h-8 px-3 rounded-full bg-gradient-brand text-[#1a2e0f] text-[11px] font-bold tracking-wide flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  {profile?.full_name?.[0]?.toUpperCase() || 'R'}
                </button>
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-neutral-200 bg-white shadow-xl py-1 text-sm z-20">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        router.push('/profile');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setProfileMenuOpen(false);
                        await supabase.auth.signOut();
                        router.push('/login');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-red-500 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Scrollable main area */}
          <main className="flex-1 overflow-y-auto p-8 space-y-6 bg-neutral-50">
            {/* ── Document expiry alerts ── */}
            {expiringDocs.length > 0 && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    Document Expiry Alerts ({expiringDocs.length})
                  </div>
                  <Link
                    href="/documents"
                    className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
                  >
                    View all →
                  </Link>
                </div>
                <div className="space-y-1.5">
                  {expiringDocs.slice(0, 5).map((doc) => {
                    const expiry = new Date(doc.expiry_date);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isExpired = days < 0;
                    return (
                      <div key={doc.id} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-700">
                          {doc.document_name}
                          {doc.fleet_vehicles && (
                            <span className="text-neutral-400"> · {doc.fleet_vehicles.vehicle_number}</span>
                          )}
                        </span>
                        <span className={isExpired ? 'text-red-500 font-semibold' : 'text-amber-600 font-semibold'}>
                          {isExpired ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Stats cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="glass-card rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Total Vehicles</p>
                  <p className="text-3xl font-bold text-neutral-900">{fleetVehicles.length}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center">
                  <Truck className="w-6 h-6 text-[#1a2e0f]" />
                </div>
              </motion.div>
              <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="glass-card rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Total Drivers</p>
                  <p className="text-3xl font-bold text-neutral-900">{fleetDrivers.length}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#1a2e0f]" />
                </div>
              </motion.div>
              <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="glass-card rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Active QR Codes</p>
                  <p className="text-3xl font-bold text-[#6eb84a]">{activeQrCount}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-[#1a2e0f]" />
                </div>
              </motion.div>
            </div>

            {/* ── Driver · Vehicle Assignments ── */}
            <motion.section
              id="assignments-section"
              variants={sectionVariants} initial="hidden" animate="visible"
              className="glass-card rounded-2xl p-6 space-y-4"
            >
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Driver · Vehicle Assignments
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Vehicles stay fixed · Drivers can change
                </p>
              </div>

              {fleetDrivers.length > 0 && fleetVehicles.length > 0 ? (
                <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100">
                  {fleetVehicles.map((vehicle) => {
                    const assignedDriver = fleetDrivers.find(
                      (d) => d.assigned_vehicle_id === vehicle.id
                    );
                    return (
                      <div
                        key={vehicle.id}
                        className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-neutral-50 transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-neutral-900">
                            {vehicle.vehicle_number}
                          </span>
                          {assignedDriver ? (
                            <>
                              <span className="text-xs text-neutral-600">
                                {assignedDriver.name}
                              </span>
                              <span className="text-xs text-neutral-400 font-mono">
                                {assignedDriver.phone}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-neutral-400">No driver assigned</span>
                          )}
                        </div>
                        <select
                          className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] outline-none"
                          value={assignedDriver?.id ?? ''}
                          onChange={(e) => {
                            const newDriverId = e.target.value;
                            if (!newDriverId) {
                              if (assignedDriver) {
                                handleAssignDriver(assignedDriver.id, null);
                              }
                            } else {
                              handleAssignDriver(newDriverId, vehicle.id);
                            }
                          }}
                        >
                          <option value="">No driver</option>
                          {fleetDrivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">
                  Add at least one vehicle and one driver to start assigning.
                </p>
              )}
            </motion.section>

            {/* ── Fleet Vehicles & Drivers side by side ── */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Fleet Vehicles */}
              <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="glass-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">
                      Fleet Vehicles
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Add vehicles, then activate QR codes
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVehicleModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-brand text-[#1a2e0f] text-xs font-semibold hover:opacity-90 active:scale-[0.97] transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Vehicle</span>
                  </button>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={handlePayment}
                    className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Proceed to QR Activation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/fleet')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition"
                  >
                    Manage vehicles
                  </button>
                </div>

                {fleetVehicles.length > 0 ? (
                  <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100">
                    {fleetVehicles.map((v) => (
                      <div
                        key={v.id}
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-neutral-50 transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-neutral-900">
                            {v.vehicle_number}
                          </span>
                          {(v.label || v.make_model) && (
                            <span className="text-xs text-neutral-400">
                              {[v.label, v.make_model].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {v.qr_token ? (
                            <>
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#6eb84a] bg-[#89d957]/10 border border-[#89d957]/30 rounded-full px-2 py-0.5">
                                QR Ready
                              </span>
                              <button
                                type="button"
                                onClick={() => v.qr_token && handleDownloadVehicleQr(v.qr_token)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-brand text-[#1a2e0f] text-xs font-medium hover:opacity-90 transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                Download
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleGenerateVehicleQr(v.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                            >
                              <QrCode className="w-3 h-3" />
                              Generate QR
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400">
                    No vehicles added yet. Use &quot;Add Vehicle&quot; to register your first vehicle.
                  </p>
                )}
              </motion.section>

              {/* Drivers & Assignments */}
              <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="glass-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">
                      Drivers &amp; Assignments
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Add drivers and assign to vehicles
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDriverModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-brand text-[#1a2e0f] text-xs font-semibold hover:opacity-90 active:scale-[0.97] transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Driver</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/drivers')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition"
                    >
                      Manage Drivers
                    </button>
                  </div>
                </div>

                {fleetDrivers.length > 0 ? (
                  <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100">
                    {fleetDrivers.map((driver) => {
                      const assignedVehicle = fleetVehicles.find(
                        (v) => v.id === driver.assigned_vehicle_id
                      );
                      return (
                        <div key={driver.id} className="px-4 py-3 hover:bg-neutral-50 transition-colors">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-sm text-neutral-900">
                              {driver.name}
                            </span>
                            <span className="text-xs text-neutral-400 font-mono">
                              {driver.phone}
                            </span>
                            {driver.blood_group && (
                              <span className="text-xs text-neutral-600">
                                Blood group: {driver.blood_group}
                              </span>
                            )}
                            {assignedVehicle && (
                              <span className="text-xs text-[#6eb84a] font-medium">
                                Assigned to: {assignedVehicle.vehicle_number}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400">
                    No drivers added yet. Use &quot;Add Driver&quot; to create your first driver.
                  </p>
                )}
              </motion.section>
            </div>
          </main>
        </div>

        {/* ── Modals ── */}
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          userId={userId || ''}
          onSuccess={handlePaymentSuccess}
          vehicleCount={fleetVehicles.length}
        />

        {isVehicleModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setIsVehicleModalOpen(false)}
            />
            <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-neutral-200">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">
                    Add Vehicle
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Save your vehicle details first, then activate its QR.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {vehicleError && (
                <div className="mb-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {vehicleError}
                </div>
              )}

              <form onSubmit={handleCreateVehicle} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                    placeholder="KA01AB1234"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    Label (optional)
                  </label>
                  <input
                    type="text"
                    value={vehicleLabel}
                    onChange={(e) => setVehicleLabel(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                    placeholder="E.g. Cab #21, Delivery Bike 3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    Make &amp; Model (optional)
                  </label>
                  <input
                    type="text"
                    value={vehicleMakeModel}
                    onChange={(e) => setVehicleMakeModel(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                    placeholder="E.g. Tata Ace, Honda Activa"
                  />
                </div>

                <button
                  type="submit"
                  disabled={vehicleSaving}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-brand text-[#1a2e0f] text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
                >
                  {vehicleSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving vehicle…</span>
                    </>
                  ) : (
                    <span>Save Vehicle</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {isDriverModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setIsDriverModalOpen(false)}
            />
            <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-neutral-200">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">
                    Add Driver
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Save driver details and optionally link them to a vehicle later.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDriverModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {driverError && (
                <div className="mb-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{driverError}</div>
              )}

              <form onSubmit={handleCreateDriver} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    Driver name
                  </label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                    placeholder="E.g. Ramesh"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    Blood group (optional)
                  </label>
                  <input
                    type="text"
                    value={driverBloodGroup}
                    onChange={(e) => setDriverBloodGroup(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm uppercase text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                    placeholder="O+"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    Notes (optional)
                  </label>
                  <textarea
                    value={driverNotes}
                    onChange={(e) => setDriverNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                    placeholder="E.g. Night shift driver, speaks Kannada and Hindi"
                  />
                </div>

                <button
                  type="submit"
                  disabled={driverSaving}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-brand text-[#1a2e0f] text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
                >
                  {driverSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving driver…</span>
                    </>
                  ) : (
                    <span>Save Driver</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white bg-rexu-grid pb-20">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] as const }}
        className="bg-white border-b border-neutral-200 sticky top-0 z-10 shadow-sm"
      >
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-brand p-2 rounded-xl">
              <Shield className="w-5 h-5 text-[#1a2e0f]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-neutral-900">My Dashboard</span>
              {profile?.full_name && (
                <span className="text-[11px] text-neutral-500">
                  {profile.full_name}
                </span>
              )}
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((open) => !open)}
              className="h-8 w-8 rounded-full bg-gradient-brand text-[#1a2e0f] text-sm font-bold flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              {profile?.full_name?.[0]?.toUpperCase() || 'R'}
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-neutral-200 bg-white shadow-xl py-1 text-sm z-20">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    router.push('/profile');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    if (typeof window !== 'undefined') {
                      const el = document.getElementById('qr-section');
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Your QR</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setProfileMenuOpen(false);
                    await supabase.auth.signOut();
                    router.push('/login');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-red-500 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="max-w-5xl mx-auto px-4 py-8 space-y-8"
      >
        {/* Welcome Card */}
        <motion.section variants={sectionVariants} initial="hidden" animate="visible">
          <div className="glass-card rounded-2xl p-8 bg-gradient-to-r from-[#89d957]/10 to-[#c9e265]/5">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              Hello, {profile?.full_name}! 👋
            </h1>
            <p className="text-neutral-600">Manage your emergency contacts and vehicle QR code.</p>
          </div>
        </motion.section>

        {/* Prompt Google OAuth users to add mobile number */}
        {profile && !profile.mobile && (
          <motion.section variants={sectionVariants} initial="hidden" animate="visible">
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold">
                <Phone className="w-4 h-4" />
                Add your mobile number
              </div>
              <p className="text-xs text-amber-600">
                We need your mobile number for emergency alerts and OTP verification. This wasn&apos;t provided during Google sign-in.
              </p>
              {mobileError && (
                <p className="text-xs text-red-500">{mobileError}</p>
              )}
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={mobileInput}
                  onChange={(e) => setMobileInput(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-amber-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition"
                />
                <button
                  onClick={handleSaveMobile}
                  disabled={savingMobile || !mobileInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingMobile ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {/* Emergency Contacts overview (between welcome and profile) */}
        {contacts.length > 0 && (
          <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#6eb84a]" /> Emergency Contacts
              </h2>
              <span className="text-[11px] text-neutral-500 uppercase tracking-[0.18em]">
                Saved ({contacts.length})
              </span>
            </div>
            <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100">
              {contacts.map((contact) => (
                <div key={contact.id} className="px-3 py-3 flex items-center justify-between gap-3 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-[#1a2e0f] text-sm font-bold">
                      {contact.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-neutral-900">
                        {contact.name}
                      </div>
                      <div className="text-[11px] text-neutral-500 uppercase tracking-wider">
                        {contact.relation}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-500">{contact.phone}</div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Emergency Profile (basic info) */}
        <motion.section
          id="emergency-profile"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="glass-card rounded-2xl p-8 space-y-6"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <User className="w-5 h-5 text-[#6eb84a]" /> Emergency Profile
            </h2>
            <span className="text-xs uppercase tracking-[0.2em] text-neutral-400">
              Basic details
            </span>
          </div>

          {emergencyError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-200">
              {emergencyError}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={profile?.full_name || ''}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-500"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  value={formGuardianPhone}
                  onChange={(e) => setFormGuardianPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    Blood Group
                  </label>
                  <select
                    required
                    value={formBloodGroup}
                    onChange={(e) => setFormBloodGroup(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 uppercase focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    Age
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={formAge}
                    onChange={(e) => setFormAge(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                    placeholder="32"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  Language
                </label>
                <select
                  value={formLanguageNote}
                  onChange={(e) => setFormLanguageNote(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                >
                  <option value="" disabled>
                    Select preferred language
                  </option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Malayalam">Malayalam</option>
                  <option value="Marathi">Marathi</option>
                  <option value="Gujarati">Gujarati</option>
                  <option value="Bengali">Bengali</option>
                  <option value="Punjabi">Punjabi</option>
                  <option value="Odia">Odia</option>
                  <option value="Assamese">Assamese</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="organ-donor"
                  type="checkbox"
                  checked={formOrganDonor}
                  onChange={(e) => setFormOrganDonor(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 accent-[#6eb84a]"
                />
                <label htmlFor="organ-donor" className="text-xs text-neutral-600">
                  Mark as organ donor
                </label>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Emergency Medical Info */}
        <motion.section variants={sectionVariants} initial="hidden" animate="visible" className="glass-card rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-[#6eb84a]" /> Medical Information
            </h2>
            <span className="text-xs uppercase tracking-[0.2em] text-neutral-400">
              Critical medical details
            </span>
          </div>

          <form onSubmit={handleSaveEmergencyProfile} className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  Allergies (highlighted in red on scan page)
                </label>
                <textarea
                  value={formAllergies}
                  onChange={(e) => setFormAllergies(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                  placeholder="E.g. Cannot tolerate anesthesia, allergic to penicillin"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  Medical Conditions
                </label>
                <textarea
                  value={formMedicalConditions}
                  onChange={(e) => setFormMedicalConditions(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                  placeholder="E.g. Diabetes, hypertension, epilepsy"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  Medications
                </label>
                <textarea
                  value={formMedications}
                  onChange={(e) => setFormMedications(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                  placeholder="E.g. On blood thinners, insulin"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  Critical Emergency Instructions (shown prominently)
                </label>
                <textarea
                  value={formEmergencyInstruction}
                  onChange={(e) => setFormEmergencyInstruction(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                  placeholder="E.g. Contact guardian before surgery. Do not administer general anesthesia without prior evaluation."
                />
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={savingEmergencyProfile}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-brand text-[#1a2e0f] text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
              >
                {savingEmergencyProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Save Emergency Info'
                )}
              </button>
            </div>
          </form>
        </motion.section>

        <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="grid md:grid-cols-2 gap-8">
          {/* QR Status & Payment */}
          <section className="space-y-6" id="qr-section">
            <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
              <h2 className="text-xl font-bold text-neutral-900 mb-6 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#6eb84a]" /> QR Status
              </h2>

              {!profile?.is_paid ? (
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200">
                    <div className="flex gap-4">
                      <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                      <div>
                        <h3 className="font-bold text-amber-700">QR Not Active</h3>
                        <p className="text-sm text-amber-600 mt-1">
                          Activate your REXU QR by paying a one-time fee of ₹299.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handlePayment}
                    className="w-full bg-gradient-brand text-[#1a2e0f] py-4 rounded-2xl font-bold hover:opacity-90 transition-all active:scale-95"
                  >
                    Pay ₹299 &amp; Activate QR
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="mx-auto w-fit p-4 bg-white rounded-3xl border-4 border-[#89d957]/20 shadow-lg">
                    <QRCodeSVG 
                      ref={qrRef}
                      value={`${process.env.NEXT_PUBLIC_APP_URL || 'https://rexu.in'}/e/${qrToken}`} 
                      size={180}
                      level="H"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[#6eb84a] font-bold">
                    <CheckCircle2 className="w-5 h-5" /> Active
                  </div>
                  <p className="text-sm text-neutral-500">Token: <span className="font-mono bg-neutral-100 px-2 py-0.5 rounded text-neutral-700">{qrToken}</span></p>
                  <button 
                    onClick={handleDownloadQR}
                    className="w-full bg-neutral-100 text-neutral-700 py-3 rounded-xl font-bold hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download QR
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Emergency Contacts */}
          <section className="space-y-6">
            <div className="glass-card rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#6eb84a]" /> Contacts
                </h2>
                {!isAddingContact && contacts.length < 3 && profile?.is_paid && (
                  <button 
                    onClick={() => setIsAddingContact(true)}
                    className="p-2 bg-[#89d957]/10 text-[#6eb84a] rounded-xl hover:bg-[#89d957]/20 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Compact summary of Emergency Profile in this card */}
              {(guardianPhone || bloodGroup || age || languageNote || emergencyInstruction) && (
                <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                      Emergency profile summary
                    </span>
                    <div className="flex items-center gap-2">
                      {bloodGroup && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#89d957]/10 border border-[#89d957]/30 text-[#6eb84a]">
                          {bloodGroup}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={scrollToEmergencyProfile}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-medium text-[#6eb84a] bg-[#89d957]/10 hover:bg-[#89d957]/20 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs text-neutral-600">
                    {guardianPhone && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                          Guardian
                        </span>
                        <span className="font-mono">{guardianPhone}</span>
                      </div>
                    )}
                    {age && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                          Age
                        </span>
                        <span>{age} yrs</span>
                      </div>
                    )}
                    {languageNote && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                          Language
                        </span>
                        <span className="truncate max-w-[220px] text-right">{languageNote}</span>
                      </div>
                    )}
                    {emergencyInstruction && (
                      <div className="mt-1">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-400 mb-1">
                          Critical note
                        </p>
                        <p className="text-xs text-neutral-700 line-clamp-2">
                          {emergencyInstruction}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!profile?.is_paid ? (
                <div className="text-center py-12">
                  <div className="bg-neutral-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-8 h-8 text-neutral-300" />
                  </div>
                  <p className="text-neutral-500 text-sm">Activate your QR to add contacts.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contacts.length > 0 && (
                    <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100">
                      {contacts.map((contact) =>
                        editingContactId === contact.id ? (
                          <form
                            key={contact.id}
                            onSubmit={handleUpdateContact}
                            className="px-4 py-3 space-y-3"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                                Edit contact
                              </span>
                              <button
                                type="button"
                                onClick={handleCancelEditContact}
                                className="text-xs text-neutral-500 hover:text-red-500"
                              >
                                Cancel
                              </button>
                            </div>
                            <input
                              placeholder="Contact Name"
                              required
                              className="w-full px-4 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                              value={editingContact.name}
                              onChange={(e) =>
                                setEditingContact((prev) => ({ ...prev, name: e.target.value }))
                              }
                            />
                            <input
                              placeholder="Relation (e.g. Father)"
                              required
                              className="w-full px-4 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                              value={editingContact.relation}
                              onChange={(e) =>
                                setEditingContact((prev) => ({ ...prev, relation: e.target.value }))
                              }
                            />
                            <input
                              placeholder="Phone Number"
                              required
                              type="tel"
                              className="w-full px-4 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                              value={editingContact.phone}
                              onChange={(e) =>
                                setEditingContact((prev) => ({ ...prev, phone: e.target.value }))
                              }
                            />
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={savingContactEdit}
                                className="flex-1 bg-gradient-brand text-[#1a2e0f] py-2 rounded-lg font-bold hover:opacity-90 disabled:opacity-50 transition"
                              >
                                {savingContactEdit ? (
                                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                ) : (
                                  'Save Changes'
                                )}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div
                            key={contact.id}
                            className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-neutral-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-[#1a2e0f] font-bold">
                                {contact.name[0]}
                              </div>
                              <div>
                                <div className="font-bold text-neutral-900">
                                  {contact.name}
                                </div>
                                <div className="text-xs text-neutral-500 uppercase tracking-wider">
                                  {contact.relation}
                                </div>
                                <div className="text-xs text-neutral-400">{contact.phone}</div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditContact(contact)}
                                className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteContact(contact.id)}
                                className="text-xs text-red-500 hover:text-red-700 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {isAddingContact && (
                    <form onSubmit={handleAddContact} className="p-6 rounded-2xl border-2 border-dashed border-neutral-200 space-y-4">
                      <input
                        placeholder="Contact Name"
                        required
                        className="w-full px-4 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                        value={newContact.name}
                        onChange={e => setNewContact({...newContact, name: e.target.value})}
                      />
                      <input
                        placeholder="Relation (e.g. Father)"
                        required
                        className="w-full px-4 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                        value={newContact.relation}
                        onChange={e => setNewContact({...newContact, relation: e.target.value})}
                      />
                      <input
                        placeholder="Phone Number"
                        required
                        type="tel"
                        className="w-full px-4 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#89d957]/40 focus:border-[#6eb84a] transition"
                        value={newContact.phone}
                        onChange={e => setNewContact({...newContact, phone: e.target.value})}
                      />
                      <div className="flex gap-2">
                        <button 
                          type="submit" 
                          disabled={savingContact}
                          className="flex-1 bg-gradient-brand text-[#1a2e0f] py-2 rounded-lg font-bold hover:opacity-90 disabled:opacity-50 transition"
                        >
                          {savingContact ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Contact'}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setIsAddingContact(false)}
                          className="px-4 py-2 text-neutral-500 font-medium hover:text-neutral-900 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {contacts.length === 0 && !isAddingContact && (
                    <p className="text-center py-8 text-neutral-400 text-sm italic">No emergency contacts added yet.</p>
                  )}
                </div>
              )}
            </div>
          </section>
        </motion.div>
      </motion.main>
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        userId={userId || ''}
        onSuccess={handlePaymentSuccess}
        // Personal accounts don't track fleet vehicle count
      />
    </div>
  );
}
