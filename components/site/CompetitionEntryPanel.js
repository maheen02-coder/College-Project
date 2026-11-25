"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, CheckCircle2, Loader2, Plus, Trash2, UserRoundPlus } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";

export default function CompetitionEntryPanel({ competition, isAuthed, verified, myEntry }) {
  const router = useRouter();
  const { toast } = useToast();
  const isTeam = competition.mode === "team";
  const min = Number(competition.teamSize?.min) || 2;
  const max = Math.max(min, Number(competition.teamSize?.max) || min);
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState([{ name: "", rollNumber: "", email: "" }]);
  const [loading, setLoading] = useState(false);

  const open = competition.status === "registration_open";
  const deadlinePassed = new Date(competition.registrationDeadline).getTime() < Date.now();

  const updateMember = (index, key, value) =>
    setMembers((current) => current.map((member, i) => (i === index ? { ...member, [key]: value } : member)));

  const addMember = () => setMembers((current) => (current.length >= max - 1 ? current : [...current, { name: "", rollNumber: "", email: "" }]));
  const removeMember = (index) => setMembers((current) => current.filter((_, i) => i !== index));

  const submit = async (event) => {
    event.preventDefault();
    if (isTeam) {
      if (teamName.trim().length < 2) {
        toast("Enter a team name.", "error");
        return;
      }
      if (members.some((member) => !member.name.trim())) {
        toast("Every teammate needs a name.", "error");
        return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/competitions/${competition.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: isTeam ? teamName.trim() : "",
          members: isTeam ? members.filter((member) => member.name.trim()) : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not submit your entry.", "error");
        return;
      }
      toast(data.item?.entryId ? `Entry confirmed · ${data.item.entryId}` : "Entry confirmed.", "success", "You're in!");
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (myEntry) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald/30 bg-emerald/5 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-emerald">
            <CheckCircle2 size={14} /> Entry submitted
          </p>
          <p className="mt-1 font-mono text-[0.72rem] text-mist">{myEntry.entryId}</p>
          {myEntry.teamName ? <p className="mt-1 text-[0.82rem] font-semibold text-ink">Team · {myEntry.teamName}</p> : null}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
          <span className="text-[0.78rem] text-mist">Status</span>
          <StatusBadge status={myEntry.status} kind="registration" />
        </div>
        {myEntry.status === "approved" && competition.leaderboardPublished && myEntry.position !== "none" ? (
          <div className="flex items-center justify-between rounded-xl border border-amber/30 bg-amber/5 px-4 py-3">
            <span className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-amber">
              <Award size={15} /> Result
            </span>
            <StatusBadge status={myEntry.position} kind="position" />
          </div>
        ) : null}
        <Link href="/dashboard/competitions" className="btn btn-secondary btn-sm w-full">
          Track in dashboard
        </Link>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="space-y-3">
        <Link href={`/login?next=/competitions/${competition.slug}`} className="btn btn-primary w-full">
          Sign in to enter
        </Link>
        <p className="text-center text-[0.72rem] text-mist">Use your KIPS student account to enter competitions.</p>
      </div>
    );
  }

  if (!verified) {
    return (
      <p className="rounded-xl bg-amber/10 px-3.5 py-3 text-center text-[0.76rem] text-amber">
        Your account must be verified before entering competitions.
      </p>
    );
  }

  if (!open || deadlinePassed) {
    return (
      <div className="space-y-3 text-center">
        <p className="rounded-xl bg-lavender px-4 py-3 text-[0.8rem] font-semibold text-mist">
          Entry window is closed for this competition.
        </p>
        <Link href="/dashboard/competitions" className="btn btn-secondary btn-sm w-full">
          View my competitions
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {isTeam ? (
        <>
          <div>
            <label className="label" htmlFor="teamName">Team name</label>
            <input
              id="teamName"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              className="field"
              placeholder="e.g. The Night Owls"
              maxLength={80}
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="label mb-0">Teammates ({min}–{max} incl. you)</span>
              <button
                type="button"
                onClick={addMember}
                disabled={members.length >= max - 1}
                className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-purple disabled:opacity-40"
              >
                <Plus size={12} /> Add
              </button>
            </div>
            <div className="space-y-2">
              {members.map((member, index) => (
                <div key={index} className="rounded-xl border border-line bg-lavender/40 p-2.5">
                  <div className="flex gap-2">
                    <input
                      value={member.name}
                      onChange={(event) => updateMember(index, "name", event.target.value)}
                      className="field"
                      placeholder="Teammate name"
                    />
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="btn btn-ghost btn-sm px-2.5"
                      aria-label="Remove teammate"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      value={member.rollNumber}
                      onChange={(event) => updateMember(index, "rollNumber", event.target.value)}
                      className="field"
                      placeholder="Roll no."
                    />
                    <input
                      value={member.email}
                      onChange={(event) => updateMember(index, "email", event.target.value)}
                      className="field"
                      placeholder="Email"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl bg-lavender px-4 py-3 text-[0.78rem] text-mist">
          <UserRoundPlus size={14} className="mr-1.5 inline text-purple" />
          You are entering as a solo participant.
        </div>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? <Loader2 size={15} className="animate-spin" /> : null}
        {loading ? "Submitting entry…" : "Submit entry"}
      </button>
    </form>
  );
}
