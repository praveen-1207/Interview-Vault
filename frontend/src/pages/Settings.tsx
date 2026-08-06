import { useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { Card, Input, Label, Button } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { userApi } from "../api/misc";

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const onSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await userApi.updateProfile({ name, bio });
      updateUser(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and preferences.</p>
      </div>

      <Card className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900">Profile Information</h3>
          <div className="w-16 h-16 rounded-full bg-brand-600 text-white flex items-center justify-center text-lg font-semibold">
            {initials || "U"}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user?.email} disabled className="bg-gray-50 text-gray-400" />
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
          </div>
        </div>
      </Card>
    </AppLayout>
  );
}
