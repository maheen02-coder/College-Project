import StatCounter from "@/components/site/StatCounter";

export default function StatsBand({ stats = {} }) {
  const items = [
    { key: "students", label: "Students onboard", icon: "students", value: stats.students || 0 },
    { key: "verified", label: "Verified profiles", icon: "verified", value: stats.verifiedStudents || 0 },
    { key: "events", label: "Live events", icon: "events", value: stats.events || 0 },
    { key: "registrations", label: "Registrations", icon: "registrations", value: stats.registrations || 0 },
    { key: "certificates", label: "Certificates", icon: "certificates", value: stats.certificates || 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <StatCounter key={item.key} value={item.value} label={item.label} icon={item.icon} />
      ))}
    </div>
  );
}
