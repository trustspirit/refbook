import { useState } from 'react';
import { Project } from '../types';
import { ChevronDown, Plus, FolderOpen, Trash2, Check, X, Loader2 } from 'lucide-react';

interface ProjectSelectorProps {
  projects: Project[];
  currentProject: Project | null;
  onSelectProject: (project: Project) => void;
  onCreateProject: (name: string, description?: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  isLoading?: boolean;
}

export default function ProjectSelector({
  projects,
  currentProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  isLoading,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await onCreateProject(newName.trim());
      setNewName('');
      setShowNewForm(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    await onDeleteProject(projectId);
    setDeleteConfirm(null);
  };

  return (
    <div className="relative">
      {/* Current Selection */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-dark-900 hover:bg-dark-800 border border-dark-700 rounded-xl transition-all"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <FolderOpen className="w-4 h-4 text-accent-400 flex-shrink-0" />
          <span className="text-sm font-medium text-dark-100 truncate">
            {currentProject ? currentProject.name : 'Select Project'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-dark-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => {
              setIsOpen(false);
              setShowNewForm(false);
              setDeleteConfirm(null);
            }}
          />
          
          {/* Menu */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-dark-900 border border-dark-700 rounded-xl shadow-soft z-20 max-h-80 overflow-hidden animate-fade-in">
            {/* Project List */}
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-dark-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </div>
              ) : projects.length === 0 ? (
                <div className="p-4 text-center text-dark-500 text-sm">
                  No projects yet
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className={`group flex items-center justify-between px-3.5 py-2.5 hover:bg-dark-800 ${
                      currentProject?.id === project.id ? 'bg-accent-500/10' : ''
                    }`}
                  >
                    {deleteConfirm === project.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-xs text-red-400 flex-1">Delete this project?</span>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="p-1.5 text-dark-400 hover:bg-dark-700 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            onSelectProject(project);
                            setIsOpen(false);
                          }}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                        >
                          <FolderOpen className={`w-4 h-4 flex-shrink-0 ${
                            currentProject?.id === project.id ? 'text-accent-400' : 'text-dark-500'
                          }`} />
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              currentProject?.id === project.id ? 'text-accent-300' : 'text-dark-100'
                            }`}>{project.name}</p>
                            <p className="text-xs text-dark-500">
                              {project.ready_resource_count || 0} / {project.resource_count || 0} resources
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(project.id);
                          }}
                          className="p-1.5 text-dark-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* New Project Form */}
            <div className="border-t border-dark-700 p-2.5">
              {showNewForm ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Project name"
                    className="flex-1 px-3 py-2 text-sm bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500/50"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate();
                      if (e.key === 'Escape') {
                        setShowNewForm(false);
                        setNewName('');
                      }
                    }}
                  />
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || isCreating}
                    className="px-3 py-2 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-lg hover:from-accent-600 hover:to-accent-700 disabled:from-dark-700 disabled:to-dark-700 disabled:text-dark-500 disabled:cursor-not-allowed transition-all"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setShowNewForm(false);
                      setNewName('');
                    }}
                    className="px-3 py-2 text-dark-400 hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewForm(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-accent-400 hover:bg-accent-500/10 rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
