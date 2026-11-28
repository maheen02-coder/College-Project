import StatCounter from "@/components/site/StatCounter";
import Reveal from "@/components/ui/Reveal";

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
      {items.map((item, index) => (
        <Reveal key={item.key} delay={index * 0.06} y={18} className="h-full">
          <StatCounter value={item.value} label={item.label} icon={item.icon} />
        </Reveal>
      ))}
    </div>
  );
}
