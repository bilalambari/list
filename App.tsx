
import React, { useState, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { StoreProvider, useStore } from './context/StoreContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/ui/Layout';
import { KanbanBoard } from './components/views/KanbanBoard';
import { GridView } from './components/views/GridView';
import { CalendarView } from './components/views/CalendarView';
import { TeamView } from './components/views/TeamView';
import { NotificationsView } from './components/views/NotificationsView';
import { TaskDetail } from './components/details/TaskDetail';
import { ProjectDetail } from './components/details/ProjectDetail';
import { ProjectModal } from './components/modals/ProjectModal';
import { ArchiveView } from './components/views/ArchiveView';
import { LayoutGrid, List, Calendar as CalendarIcon, Plus, Filter, Search, X } from 'lucide-react';
import { ProjectStatus, TaskStatus, Priority } from './types';
import { MultiSelect } from './components/ui/MultiSelect';

// --- Login Page ---
const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h1>
        <p className="text-slate-500 mb-6">Sign in to TaskFlow Workspace</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition-colors">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Protected Route Wrapper ---
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// --- Projects Page with Advanced Filtering ---
const ProjectsPage = () => {
  const { projects, members } = useStore();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtering State
  const [showFilters, setShowFilters] = useState(false);
  const [matchAll, setMatchAll] = useState(true);
  const [filters, setFilters] = useState<{ field: string; operator: string; value: string }[]>([
    { field: 'name', operator: 'contains', value: '' }
  ]);

  const filteredProjects = useMemo(() => {
    // Filter out archived projects by default
    const activeProjects = projects.filter(p => p.status !== ProjectStatus.ARCHIVED);

    if (filters.length === 0) return activeProjects;

    return activeProjects.filter(project => {
      const results = filters.map(f => {
        if (!f.value) return true;
        const val = f.value.toLowerCase();

        switch (f.field) {
          case 'name': return project.name.toLowerCase().includes(val);
          case 'status': return project.status === f.value;
          case 'budget':
            if (f.operator === 'gt') return project.budget > Number(val);
            if (f.operator === 'lt') return project.budget < Number(val);
            return project.budget === Number(val);
          case 'dueDate': return project.dueDate.includes(val);
          case 'lead': return project.leadId === f.value;
          default: return true;
        }
      });
      return matchAll ? results.every(Boolean) : results.some(Boolean);
    });
  }, [projects, filters, matchAll]);

  const addFilter = () => setFilters([...filters, { field: 'name', operator: 'contains', value: '' }]);
  const updateFilter = (index: number, key: string, val: string) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [key]: val };
    setFilters(newFilters);
  };
  const removeFilter = (index: number) => setFilters(filters.filter((_, i) => i !== index));

  return (
    <div className="p-6 md:p-10 space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500">Manage your active projects and workflows.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Filter size={18} /> Filters
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
            <Plus size={18} /> New Project
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm font-bold text-slate-700">Match condition:</span>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => setMatchAll(true)} className={`px-3 py-1 text-xs font-bold rounded ${matchAll ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>ALL (AND)</button>
              <button onClick={() => setMatchAll(false)} className={`px-3 py-1 text-xs font-bold rounded ${!matchAll ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>ANY (OR)</button>
            </div>
          </div>

          <div className="space-y-3">
            {filters.map((filter, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <select value={filter.field} onChange={(e) => updateFilter(idx, 'field', e.target.value)} className="text-sm bg-white border border-slate-300 rounded px-2 py-1.5 focus:ring-indigo-500">
                  <option value="name">Name</option>
                  <option value="status">Status</option>
                  <option value="lead">Lead / Manager</option>
                  <option value="budget">Budget</option>
                  <option value="dueDate">Due Date</option>
                </select>

                {filter.field === 'budget' ? (
                  <select value={filter.operator} onChange={(e) => updateFilter(idx, 'operator', e.target.value)} className="text-sm bg-white border border-slate-300 rounded px-2 py-1.5 focus:ring-indigo-500 w-24">
                    <option value="eq">Equals</option>
                    <option value="gt">Gt Than</option>
                    <option value="lt">Lt Than</option>
                  </select>
                ) : (
                  <span className="text-sm text-slate-500 px-2">contains</span>
                )}

                {filter.field === 'status' ? (
                  <select value={filter.value} onChange={(e) => updateFilter(idx, 'value', e.target.value)} className="text-sm bg-white border border-slate-300 rounded px-2 py-1.5 focus:ring-indigo-500 flex-1">
                    <option value="">Any</option>
                    {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : filter.field === 'lead' ? (
                  <select value={filter.value} onChange={(e) => updateFilter(idx, 'value', e.target.value)} className="text-sm bg-white border border-slate-300 rounded px-2 py-1.5 focus:ring-indigo-500 flex-1">
                    <option value="">Select Member...</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                ) : (
                  <input
                    type={filter.field === 'budget' ? 'number' : filter.field === 'dueDate' ? 'date' : 'text'}
                    value={filter.value}
                    onChange={(e) => updateFilter(idx, 'value', e.target.value)}
                    placeholder="Value..."
                    className="text-sm bg-white border border-slate-300 rounded px-2 py-1.5 focus:ring-indigo-500 flex-1"
                  />
                )}
                <button onClick={() => removeFilter(idx)} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
              </div>
            ))}
          </div>
          <button onClick={addFilter} className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800">+ Add Condition</button>
        </div>
      )}

      {/* Project List */}
      <div className="mt-6">
        <GridView type="projects" data={filteredProjects} />
      </div>

      <ProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

const TasksPage = () => {
  const { tasks, members, projects } = useStore();
  const [view, setView] = useState<'KANBAN' | 'GRID' | 'CALENDAR'>('KANBAN');
  const navigate = useNavigate();

  // Advanced Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [matchAll, setMatchAll] = useState(true);
  const [filters, setFilters] = useState<{ field: string; value: any }[]>([
    { field: 'title', value: '' }
  ]);

  const filteredTasks = useMemo(() => {
    if (filters.length === 0) return tasks;
    return tasks.filter(task => {
      const results = filters.map(f => {
        if (!f.value) return true;
        switch (f.field) {
          case 'title': return typeof f.value === 'string' && task.title.toLowerCase().includes(f.value.toLowerCase());
          case 'status':
            return Array.isArray(f.value) && f.value.length > 0
              ? f.value.includes(task.status)
              : true;
          case 'priority':
            return Array.isArray(f.value) && f.value.length > 0
              ? f.value.includes(task.priority)
              : true;
          case 'project': return task.projectId === f.value;
          case 'assignee': return task.assigneeIds && task.assigneeIds.includes(f.value);
          default: return true;
        }
      });
      return matchAll ? results.every(Boolean) : results.some(Boolean);
    });
  }, [tasks, filters, matchAll]);

  const addFilter = () => setFilters([...filters, { field: 'title', value: '' }]);
  const updateFilter = (index: number, key: string, val: any) => {
    const newFilters = [...filters];
    // If changing field to/from status/priority, reset value
    if (key === 'field') {
      if (['status', 'priority'].includes(val)) {
        newFilters[index] = { ...newFilters[index], [key]: val, value: [] };
      } else {
        newFilters[index] = { ...newFilters[index], [key]: val, value: '' };
      }
    } else {
      newFilters[index] = { ...newFilters[index], [key]: val };
    }
    setFilters(newFilters);
  };
  const removeFilter = (index: number) => setFilters(filters.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-slate-200 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-xl font-bold text-slate-900">Task Board</h1>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Filter size={18} /> Filters
          </button>
          <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
            <button onClick={() => setView('KANBAN')} className={`p-2 rounded-md ${view === 'KANBAN' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <LayoutGrid size={18} />
            </button>
            <button onClick={() => setView('GRID')} className={`p-2 rounded-md ${view === 'GRID' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <List size={18} />
            </button>
            <button onClick={() => setView('CALENDAR')} className={`p-2 rounded-md ${view === 'CALENDAR' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <CalendarIcon size={18} />
            </button>
          </div>
          <button
            onClick={() => navigate('/tasks/new')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {/* Task Filters Panel */}
      {showFilters && (
        <div className="bg-white p-4 border-b border-slate-200 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-sm font-bold text-slate-700">Match condition:</span>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => setMatchAll(true)} className={`px-3 py-1 text-xs font-bold rounded ${matchAll ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>ALL (AND)</button>
              <button onClick={() => setMatchAll(false)} className={`px-3 py-1 text-xs font-bold rounded ${!matchAll ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>ANY (OR)</button>
            </div>
          </div>
          <div className="space-y-3">
            {filters.map((filter, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <select value={filter.field} onChange={(e) => updateFilter(idx, 'field', e.target.value)} className="text-sm bg-white border border-slate-300 rounded px-2 py-1.5 focus:ring-indigo-500">
                  <option value="title">Title</option>
                  <option value="status">Status</option>
                  <option value="priority">Priority</option>
                  <option value="project">Project</option>
                  <option value="assignee">Assignee</option>
                </select>
                <span className="text-sm text-slate-500 px-2">is</span>

                {filter.field === 'title' ? (
                  <input type="text" value={filter.value} onChange={(e) => updateFilter(idx, 'value', e.target.value)} placeholder="Task title..." className="text-sm bg-white border border-slate-300 rounded px-2 py-1.5 focus:ring-indigo-500 flex-1" />
                ) : filter.field === 'status' ? (
                  <div className="flex-1 min-w-[200px]">
                    <MultiSelect
                      options={Object.values(TaskStatus)}
                      selected={Array.isArray(filter.value) ? filter.value : []}
                      onChange={(selected) => updateFilter(idx, 'value', selected)}
                      placeholder="Select Statuses..."
                    />
                  </div>
                ) : filter.field === 'priority' ? (
                  <div className="flex-1 min-w-[200px]">
                    <MultiSelect
                      options={Object.values(Priority)}
                      selected={Array.isArray(filter.value) ? filter.value : []}
                      onChange={(selected) => updateFilter(idx, 'value', selected)}
                      placeholder="Select Priorities..."
                    />
                  </div>
                ) : filter.field === 'project' ? (
                  <select value={filter.value} onChange={(e) => updateFilter(idx, 'value', e.target.value)} className="text-sm bg-white border border-slate-300 rounded px-2 py-1.5 focus:ring-indigo-500 flex-1">
                    <option value="">Any Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                ) : (
                  <select value={filter.value} onChange={(e) => updateFilter(idx, 'value', e.target.value)} className="text-sm bg-white border border-slate-300 rounded px-2 py-1.5 focus:ring-indigo-500 flex-1">
                    <option value="">Any Member</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                )}
                <button onClick={() => removeFilter(idx)} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
              </div>
            ))}
          </div>
          <button onClick={addFilter} className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-800">+ Add Condition</button>
        </div>
      )}

      <div className="flex-1 overflow-hidden bg-slate-50/50 p-2 md:p-6">
        {view === 'KANBAN' && <KanbanBoard tasks={filteredTasks} />}
        {view === 'GRID' && <div className="p-4 h-full overflow-y-auto"><GridView type="tasks" data={filteredTasks} /></div>}
        {view === 'CALENDAR' && <div className="h-full"><CalendarView tasks={filteredTasks} projects={projects} /></div>}
      </div>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <StoreProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<ProjectsPage />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="/tasks" element={<TasksPage />} />
                    <Route path="/tasks/:id" element={<TaskDetail />} />
                    <Route path="/team" element={<TeamView />} />
                    <Route path="/archive" element={<ArchiveView />} />
                    <Route path="/notifications" element={<NotificationsView />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </StoreProvider>
  );
};

export default App;
