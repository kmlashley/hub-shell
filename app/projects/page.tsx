import { createServerClient } from "@/lib/supabase-server";
import { fmtDate } from "@/lib/fmt-date";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  created_at: string;
}

async function getProjects(): Promise<Project[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Project[];
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-accent/10 text-accent",
  paused: "bg-gold/10 text-gold",
  completed: "bg-primary/10 text-primary",
  archived: "bg-border text-muted",
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">Projects</h1>
        <p className="text-sm text-muted">Track ongoing work across your business.</p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted">No projects yet.</p>
          <p className="text-xs text-muted mt-1">Add your first project via the Supabase dashboard or extend this page with a creation form.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-border rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-dark">{project.name}</h3>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[project.status] ?? "bg-border text-muted"}`}>
                  {project.status}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-muted mb-3">{project.description}</p>
              )}
              <p className="text-xs text-muted">Created {fmtDate(project.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
