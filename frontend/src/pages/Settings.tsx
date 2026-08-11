import { useState } from "react";
import { Briefcase, MapPin, Link2, Code, Target, LogOut } from "lucide-react";
import AppLayout from "../components/layout/AppLayout";
import { Card, Input, Label, Button } from "../components/ui";
import { useAuth } from "../context/useAuth";
import { userApi } from "../api/misc";

// The career options a user can pick for "current occupation". The signup
// form never asks for this, so it's captured here on the Settings page.
const OCCUPATIONS = ["Student", "Fresher", "Working Professional", "Job Seeker"];

// ---- Settings ----------------------------------------------------------
// Change profile + account options. Shows only the profile edit form and a
// logout action; the read-only view of the user's details lives on the
// Profile page ("View Profile" in the top bar).
export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [occupation, setOccupation] = useState(user?.occupation || "");
  const [targetRole, setTargetRole] = useState(user?.target_role || "");
  const [location, setLocation] = useState(user?.location || "");
  const [linkedin, setLinkedin] = useState(user?.linkedin || "");
  const [github, setGithub] = useState(user?.github || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Persist the edited profile, then sync it into the shared auth state.
  const onSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await userApi.updateProfile({
        name,
        bio,
        occupation: occupation || undefined,
        target_role: targetRole || undefined,
        location: location || undefined,
        linkedin: linkedin || undefined,
        github: github || undefined,
      });
      updateUser(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Change your profile details and manage your account.
        </p>
      </div>

      <div className="max-w-3xl space-y-4">
        {/* Change profile */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-5">Change Profile</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user?.email} disabled className="bg-gray-50 text-gray-400" />
              </div>
            </div>

            <div>
              <Label>
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" /> Current Occupation
                </span>
              </Label>
              <select
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="">Select your current status...</option>
                {OCCUPATIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Let us know what you are right now — e.g. Student, Fresher, or Working Professional.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>
                  <span className="inline-flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> Target Role
                  </span>
                </Label>
                <Input
                  placeholder="e.g. Software Engineer"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
              </div>
              <div>
                <Label>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Location
                  </span>
                </Label>
                <Input
                  placeholder="e.g. Bengaluru, India"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5" /> LinkedIn Profile
                  </span>
                </Label>
                <Input
                  placeholder="https://linkedin.com/in/yourname"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                />
              </div>
              <div>
                <Label>
                  <span className="inline-flex items-center gap-1">
                    <Code className="w-3.5 h-3.5" /> GitHub Profile
                  </span>
                </Label>
                <Input
                  placeholder="https://github.com/yourname"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Bio</Label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a bit about yourself..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-200 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={onSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              {saved && <span className="text-sm text-emerald-600">Saved!</span>}
              <span className="flex-1" />
              <Button variant="secondary" onClick={logout}>
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
