"use client";

type Project = { id: string; name: string };

type Props = {
  projects: Project[];
  value: string;
  onChange: (projectId: string) => void;
  label?: string;
};

export function PageFactoryProjectBar({ projects, value, onChange, label = "Aktif proje" }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 flex flex-wrap items-end gap-3">
      <label className="block flex-1 min-w-[200px] max-w-md">
        <span className="text-xs font-medium text-gray-600 mb-1 block">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">— Proje seçin —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-gray-500 pb-2">
        Pipeline, Review Queue ve Published Pages bu projeye göre filtrelenir.
      </p>
    </div>
  );
}
