"use client";

import React, { useEffect, useRef, useState } from "react";
import { PersonalInfo } from "@/lib/schema";
import { uploadUserPhoto, resolvePhotoSignedUrl } from "@/lib/storage/userFiles";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Camera,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import { LinkedinIcon, GithubIcon } from "@/components/common/BrandIcons";

interface PersonalInfoFormProps {
  personal: PersonalInfo;
  onChange: (patch: Partial<PersonalInfo>) => void;
}

export const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
  personal,
  onChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | undefined>(personal.photo);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    let active = true;
    if (!personal.photo) {
      setPhotoPreviewUrl(undefined);
    } else {
      resolvePhotoSignedUrl(personal.photo).then((url) => {
        if (active) setPhotoPreviewUrl(url);
      });
    }
    return () => {
      active = false;
    };
  }, [personal.photo]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const ref = await uploadUserPhoto(file);
      onChange({ photo: ref });
    } catch (err: any) {
      alert(err?.message || "Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addExtraLink = () => {
    const current = personal.extraLinks || [];
    onChange({
      extraLinks: [...current, { label: "Portfolio", url: "" }],
    });
  };

  const updateExtraLink = (index: number, patch: { label?: string; url?: string }) => {
    const current = [...(personal.extraLinks || [])];
    current[index] = { ...current[index], ...patch };
    onChange({ extraLinks: current });
  };

  const removeExtraLink = (index: number) => {
    const current = (personal.extraLinks || []).filter((_, idx) => idx !== index);
    onChange({ extraLinks: current });
  };

  return (
    <div className="space-y-4 bg-white dark:bg-neutral-900 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
            <User className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
            Personal & Contact Information
          </h3>
        </div>

        {/* Photo avatar upload */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            className="hidden"
          />
          {personal.photo ? (
            <div className="relative group">
              {photoPreviewUrl && (
                <img
                  src={photoPreviewUrl}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover border border-neutral-300 dark:border-neutral-700"
                />
              )}
              <button
                type="button"
                onClick={() => onChange({ photo: undefined })}
                className="absolute -top-1 -right-1 p-0.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-xs opacity-90 group-hover:opacity-100 transition-opacity"
                title="Remove photo"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              {uploadingPhoto ? "Uploading…" : "Upload Photo"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            value={personal.fullName || ""}
            onChange={(e) => onChange({ fullName: e.target.value })}
            placeholder="e.g. Alex Rivera"
            className="w-full text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Professional Title
          </label>
          <input
            type="text"
            value={personal.jobTitle || ""}
            onChange={(e) => onChange({ jobTitle: e.target.value })}
            placeholder="e.g. Senior Full-Stack Engineer"
            className="w-full text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 flex items-center gap-1">
            <Mail className="w-3 h-3" /> Email
          </label>
          <input
            type="email"
            value={personal.email || ""}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="alex@example.com"
            className="w-full text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 flex items-center gap-1">
            <Phone className="w-3 h-3" /> Phone
          </label>
          <input
            type="text"
            value={personal.phone || ""}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
            className="w-full text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Location
          </label>
          <input
            type="text"
            value={personal.location || ""}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="San Francisco, CA"
            className="w-full text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 flex items-center gap-1">
            <Globe className="w-3 h-3" /> Website / Portfolio
          </label>
          <input
            type="text"
            value={personal.website || ""}
            onChange={(e) => onChange({ website: e.target.value })}
            placeholder="https://yourwebsite.com"
            className="w-full text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 flex items-center gap-1">
            <LinkedinIcon className="w-3 h-3" /> LinkedIn
          </label>
          <input
            type="text"
            value={personal.linkedin || ""}
            onChange={(e) => onChange({ linkedin: e.target.value })}
            placeholder="linkedin.com/in/username"
            className="w-full text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 flex items-center gap-1">
            <GithubIcon className="w-3 h-3" /> GitHub
          </label>
          <input
            type="text"
            value={personal.github || ""}
            onChange={(e) => onChange({ github: e.target.value })}
            placeholder="github.com/username"
            className="w-full text-sm px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Extra links */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Additional Links
          </span>
          <button
            type="button"
            onClick={addExtraLink}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            <Plus className="w-3 h-3" /> Add Link
          </button>
        </div>

        {personal.extraLinks && personal.extraLinks.length > 0 && (
          <div className="space-y-2">
            {personal.extraLinks.map((link, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => updateExtraLink(idx, { label: e.target.value })}
                  placeholder="Label (e.g. Medium)"
                  className="w-1/3 text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-900"
                />
                <input
                  type="text"
                  value={link.url}
                  onChange={(e) => updateExtraLink(idx, { url: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-900"
                />
                <button
                  type="button"
                  onClick={() => removeExtraLink(idx)}
                  className="p-1 text-neutral-400 hover:text-rose-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
