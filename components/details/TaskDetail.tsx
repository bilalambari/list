import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { Task, TaskStatus, Priority, SubTask, Comment, TeamMember, Attachment } from '../../types';
import { STATUS_COLORS } from '../../constants';
import { ConfirmModal } from '../modals/ConfirmModal';
import { api } from '../../services/api';
import { ArrowLeft, Save, Trash2, X, Calendar, User, Tag, Paperclip, CheckSquare, Clock, Play, Pause, RotateCcw, Volume2, VolumeX, MessageSquare, Send, Upload, FileText, Image, AlertTriangle } from 'lucide-react';

const JFANS_CHECKLIST = [
    "Cek Perhitungan Utilization rate harus Benar",
    "Pastikan History Masa sewa fasilitas telah di masukan pada JFANS",
    "Pastikan luasan SAMA bangunan existing fasilitas (renewal) Pada tabel JFANS",
    "Pastikan kandidat yg terdapat di PpT masuk semua k Survey report JFANS",
    "Bila Relokasi Tanyakan apakah ada Renovasi di Gudang Existing sebelumnya",
    "History negosiasi Fasilitas WAJIB Ada (Bukti Chat Nego Gpp Apalagi kalau Harga Naik)",
    "Jika terdapat hasil negosiasi angka sebelum nya dicantumkan agar Pak Jojo Tau. SS Chat Gpp",
    "Data shipment + (pastikan sesuai dengan fungsi)",
    "Data man power, kendaraan, jumlah karyawan + (pastikan sesuai dengan fungsi)",
    "Profile Data & Photo Existing fasilitas harus ada Maps yang valid",
    "Data & Photo kandidat fasilitas relokasi harus ada & Maps Jarak dengan lokasi existing.",
    "Setiap relokasi Wajib memberikan Maps Jarak antar lokasi existing Dan yg baru",
    "Bila di butuhkan bisa dikasih data tambahan P&L dll",
    "Apakah PPT Sudah di Upload ke JFANS?(Centang bila Sudah upload di JFANS)"

];

export const TaskDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { tasks, projects, members, addTask, updateTask, deleteTask, addNotification } = useStore();
    const { user } = useAuth();

    const isNew = id === 'new';
    const existingTask = tasks.find(t => t.id === id);

    const [formData, setFormData] = useState<Partial<Task>>({
        title: '',
        status: TaskStatus.BACKLOG,
        priority: Priority.MEDIUM,
        tags: [],
        assigneeIds: [],
        checklist: [],
        notes: '',
        attachments: [],
        comments: [],
        dueDate: new Date().toISOString().split('T')[0],
        pomodoroSessions: 0,
    });

    const [commentText, setCommentText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Mention Logic
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const commentInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pomodoro State
    const [timerLeft, setTimerLeft] = useState(25 * 60);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [timerMode, setTimerMode] = useState<'FOCUS' | 'SHORT' | 'LONG'>('FOCUS');
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Timer Logic
    useEffect(() => {
        let interval: any = null;
        if (isTimerActive && timerLeft > 0) {
            interval = setInterval(() => {
                setTimerLeft((prev) => prev - 1);
            }, 1000);
        } else if (timerLeft === 0 && isTimerActive) {
            // Timer just completed
            setIsTimerActive(false);

            // Play notification sound
            if (soundEnabled) {
                const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
                audio.play().catch(e => console.log("Audio play failed", e));
            }

            // If a FOCUS session finishes, increment productivity count
            if (timerMode === 'FOCUS') {
                setFormData(prev => {
                    const newSessionCount = (prev.pomodoroSessions || 0) + 1;

                    // Auto-save session count immediately if task exists
                    if (!isNew && id && existingTask) {
                        const updatedTask = {
                            ...existingTask,
                            ...prev,
                            pomodoroSessions: newSessionCount,
                            updatedAt: new Date().toISOString()
                        };
                        updateTask(updatedTask).catch(err => console.error("Failed to auto-save timer session", err));
                        api.updateTaskField(id, 'pomodoro_sessions', newSessionCount);
                    }

                    return {
                        ...prev,
                        pomodoroSessions: newSessionCount
                    };
                });
            }
        }
        return () => clearInterval(interval);
    }, [isTimerActive, timerLeft, soundEnabled, timerMode, isNew, id, existingTask, updateTask]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleTimerReset = () => {
        setIsTimerActive(false);
        switch (timerMode) {
            case 'FOCUS': setTimerLeft(25 * 60); break;
            case 'SHORT': setTimerLeft(5 * 60); break;
            case 'LONG': setTimerLeft(15 * 60); break;
        }
    };

    const switchTimerMode = (mode: 'FOCUS' | 'SHORT' | 'LONG') => {
        setTimerMode(mode);
        setIsTimerActive(false);
        switch (mode) {
            case 'FOCUS': setTimerLeft(25 * 60); break;
            case 'SHORT': setTimerLeft(5 * 60); break;
            case 'LONG': setTimerLeft(15 * 60); break;
        }
    }

    // Populate Form with Existing Task
    useEffect(() => {
        if (existingTask) {
            setFormData({
                ...existingTask,
                assigneeIds: existingTask.assigneeIds || [],
                dueDate: existingTask.dueDate ? existingTask.dueDate.split('T')[0] : '',
                pomodoroSessions: existingTask.pomodoroSessions || 0,
            });
        }
    }, [existingTask]);

    // JFANS Default Checklist Logic
    useEffect(() => {
        if (!formData.projectId) return;

        const project = projects.find(p => p.id === formData.projectId);
        if (project && project.name.toLowerCase().includes("jfans approval")) {
            // Only auto-populate if the checklist is currently empty to avoid overwriting user data
            if (!formData.checklist || formData.checklist.length === 0) {
                const newChecklist: SubTask[] = JFANS_CHECKLIST.map(title => ({
                    id: Math.random().toString(36).substr(2, 9),
                    title: title,
                    completed: false
                }));
                setFormData(prev => ({ ...prev, checklist: newChecklist }));
            }
        }
    }, [formData.projectId, projects]);

    if (!existingTask && !isNew) return <div className="p-8">Task not found</div>;

    const handleSave = async () => {
        if (!formData.title?.trim()) return alert('Title is required');

        setIsSaving(true);
        try {
            const taskData: Task = {
                id: isNew ? Math.random().toString(36).substr(2, 9) : id!,
                title: formData.title!,
                // Use nullish coalescing to allow empty string (No Project) but default to first project if undefined (initial load)
                projectId: formData.projectId ?? (projects[0]?.id || ''),
                status: formData.status as TaskStatus,
                priority: formData.priority as Priority,
                assigneeIds: formData.assigneeIds || [],
                dueDate: new Date(formData.dueDate || Date.now()).toISOString(),
                tags: formData.tags || [],
                checklist: formData.checklist || [],
                attachments: formData.attachments || [],
                comments: formData.comments || [],
                notes: formData.notes || '',
                pomodoroSessions: formData.pomodoroSessions || 0,
                createdAt: existingTask?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            if (isNew) {
                await addTask(taskData);
            } else {
                await updateTask(taskData);
            }
            navigate('/tasks');
        } catch (error) {
            console.error("Failed to save task", error);
            alert("Failed to save task. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        setIsSaving(true);
        try {
            await deleteTask(id!);
            navigate('/tasks');
        } catch (error) {
            console.error("Failed to delete", error);
            alert("Failed to delete task.");
        } finally {
            setIsSaving(false);
            setIsDeleteModalOpen(false);
        }
    }

    const addChecklistItem = () => {
        const newItem: SubTask = { id: Math.random().toString(36).substr(2, 9), title: '', completed: false };
        setFormData({ ...formData, checklist: [...(formData.checklist || []), newItem] });
    }

    const handleChecklistKeyDown = (e: React.KeyboardEvent, itemId: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addChecklistItem();
        }
    }

    const toggleChecklist = (itemId: string) => {
        setFormData({
            ...formData,
            checklist: formData.checklist?.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item)
        });
    }

    const toggleAssignee = (memberId: string) => {
        const current = formData.assigneeIds || [];
        if (current.includes(memberId)) {
            setFormData({ ...formData, assigneeIds: current.filter(id => id !== memberId) });
        } else {
            setFormData({ ...formData, assigneeIds: [...current, memberId] });
        }
    };

    // Attachment Logic
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limit file size to 20MB
        const MAX_SIZE = 20 * 1024 * 1024; // 20 MB in bytes
        if (file.size > MAX_SIZE) {
            setUploadError("File size exceeds 20MB limit.");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        setUploadError(null);
        try {
            const url = await api.uploadFile(file);
            const newAttachment: Attachment = {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                url: url,
                type: file.type.startsWith('image/') ? 'image' : 'file'
            };
            setFormData(prev => ({
                ...prev,
                attachments: [...(prev.attachments || []), newAttachment]
            }));

            // Clear input on success
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
            console.error("Upload failed", error);
            if (error.message === "BUCKET_NOT_FOUND") {
                setUploadError("Configuration Required: Please create a public storage bucket named 'task-attachments' in your Supabase project dashboard.");
            } else {
                setUploadError(`Upload failed: ${error.message || 'Unknown error'}`);
            }
        } finally {
            setIsUploading(false);
        }
    };

    const removeAttachment = (attachmentId: string) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments?.filter(a => a.id !== attachmentId)
        }));
    };

    // Handle Comment Input Changes for Mentions
    const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCommentText(val);

        const lastWord = val.split(' ').pop();
        if (lastWord && lastWord.startsWith('@')) {
            setMentionQuery(lastWord.substring(1));
            setShowMentionList(true);
        } else {
            setShowMentionList(false);
        }
    };

    const insertMention = (member: TeamMember) => {
        const words = commentText.split(' ');
        words.pop();
        const newText = [...words, `@${member.name} `].join(' ');
        setCommentText(newText);
        setShowMentionList(false);
        if (commentInputRef.current) commentInputRef.current.focus();
    };

    const handlePostComment = () => {
        if (!commentText.trim() || !user) return;

        const newComment: Comment = {
            id: Math.random().toString(36).substr(2, 9),
            taskId: id || '',
            userId: user.id,
            text: commentText,
            createdAt: new Date().toISOString()
        };

        const updatedComments = [...(formData.comments || []), newComment];
        setFormData({ ...formData, comments: updatedComments });
        setCommentText('');

        if (!isNew && existingTask) {
            updateTask({ ...existingTask, comments: updatedComments });
        }

        const mentionRegex = /@([a-zA-Z0-9 ]+)/g;
        let match;
        const mentionedNames = new Set<string>();
        while ((match = mentionRegex.exec(newComment.text)) !== null) {
            mentionedNames.add(match[1].trim());
        }

        mentionedNames.forEach(name => {
            const mentionedMember = members.find(m => m.name.toLowerCase().includes(name.toLowerCase()));

            if (mentionedMember && mentionedMember.id !== user.id) {
                addNotification({
                    id: Math.random().toString(36).substr(2, 9),
                    userId: mentionedMember.id,
                    type: 'MENTION',
                    message: `${user.name} mentioned you in "${formData.title}"`,
                    link: `/tasks/${id}`,
                    isRead: false,
                    createdAt: new Date().toISOString()
                });
            }
        });
    };

    const renderCommentText = (text: string) => {
        const parts = text.split(/(@[\w\s]+)/g);
        return parts.map((part, i) =>
            part.startsWith('@') ? <span key={i} className="text-indigo-600 font-bold bg-indigo-50 px-1 rounded">{part}</span> : part
        );
    };

    const filteredMembers = members.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase()));

    const isArchived = formData.status === TaskStatus.ARCHIVED;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 pb-20">
            <div className="mb-6 flex items-center justify-between">
                <button onClick={() => navigate('/tasks')} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft size={18} className="mr-2" /> Back
                </button>
                {!isArchived && (
                    <div className="flex gap-3">
                        {!isNew && (
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                disabled={isSaving}
                                className="px-4 py-2 text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                        >
                            <Save size={16} /> {isSaving ? 'Saving...' : 'Save Task'}
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-8">
                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Task Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter task title here..."
                                className="w-full text-2xl md:text-3xl font-bold text-slate-900 placeholder:text-slate-300 border-none focus:ring-0 p-0 bg-transparent"
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                Notes / Description
                            </h3>
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Add a detailed description..."
                                className="w-full h-40 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-y"
                            />
                        </div>

                        {/* Attachments */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Paperclip size={18} /> Attachments</h3>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    {isUploading ? 'Uploading...' : <><Upload size={12} /> Upload</>}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                            </div>

                            {uploadError && (
                                <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg flex items-start gap-2">
                                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                    <span>{uploadError}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {formData.attachments?.map((att) => (
                                    <div key={att.id} className="group relative bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col items-center justify-center text-center gap-2 hover:bg-white hover:shadow-sm transition-all">
                                        {att.type === 'image' ? (
                                            <div className="w-full h-24 bg-slate-100 rounded-md overflow-hidden mb-1 relative">
                                                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-2">
                                                <FileText size={20} />
                                            </div>
                                        )}
                                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-700 font-medium hover:text-indigo-600 truncate w-full px-1">
                                            {att.name}
                                        </a>
                                        <button
                                            onClick={() => removeAttachment(att.id)}
                                            className="absolute top-2 right-2 p-1 bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                {(!formData.attachments || formData.attachments.length === 0) && (
                                    <div className="col-span-full text-center py-4 text-slate-400 text-sm italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        No files attached.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Checklist */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><CheckSquare size={18} /> Checklist</h3>
                                <button onClick={addChecklistItem} className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-3 py-1.5 rounded-lg transition-colors">+ Add Item</button>
                            </div>
                            <div className="space-y-2">
                                {formData.checklist?.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 group bg-slate-50 border border-slate-100 rounded-lg p-2 transition-colors hover:bg-white hover:border-slate-200">
                                        <input
                                            type="checkbox"
                                            checked={item.completed}
                                            onChange={() => toggleChecklist(item.id)}
                                            className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={item.title}
                                            onKeyDown={(e) => handleChecklistKeyDown(e, item.id)}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                checklist: formData.checklist?.map(i => i.id === item.id ? { ...i, title: e.target.value } : i)
                                            })}
                                            className={`flex-1 border-none focus:ring-0 p-0 text-sm bg-transparent placeholder:text-slate-400 ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}
                                            placeholder="Checklist item..."
                                        />
                                        <button
                                            onClick={() => setFormData({ ...formData, checklist: formData.checklist?.filter(i => i.id !== item.id) })}
                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all px-2"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                {(!formData.checklist || formData.checklist.length === 0) && (
                                    <div className="text-center py-4 text-slate-400 text-sm italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        No checklist items yet.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div className="space-y-4 pt-4 border-t border-slate-100 relative">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><MessageSquare size={18} /> Comments</h3>

                            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2">
                                {formData.comments?.map(comment => {
                                    const author = members.find(m => m.id === comment.userId);
                                    return (
                                        <div key={comment.id} className="flex gap-3">
                                            <img src={author?.avatarUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0 border border-slate-200" />
                                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg rounded-tl-none flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-slate-800">{author?.name || 'Unknown'}</span>
                                                    <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-600">{renderCommentText(comment.text)}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="relative">
                                <div className="flex gap-2">
                                    <input
                                        ref={commentInputRef}
                                        type="text"
                                        value={commentText}
                                        onChange={handleCommentChange}
                                        onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                        placeholder="Write a comment... use @ to mention"
                                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 placeholder:text-slate-400"
                                    />
                                    <button onClick={handlePostComment} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm">
                                        <Send size={18} />
                                    </button>
                                </div>

                                {showMentionList && filteredMembers.length > 0 && (
                                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-10 animate-in slide-in-from-bottom-2">
                                        <div className="p-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500">Mention Member</div>
                                        {filteredMembers.map(m => (
                                            <div
                                                key={m.id}
                                                onClick={() => insertMention(m)}
                                                className="flex items-center gap-2 p-2 hover:bg-indigo-50 cursor-pointer transition-colors"
                                            >
                                                <img src={m.avatarUrl} className="w-6 h-6 rounded-full" />
                                                <span className="text-sm text-slate-700 font-medium">{m.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Meta & Tools */}
                <div className="space-y-6">
                    {/* Pomodoro Timer */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-slate-800 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 text-indigo-600">
                            <Clock size={100} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold flex items-center gap-2 text-indigo-600"><Clock size={18} /> Focus Timer</h3>
                                <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                                </button>
                            </div>

                            <div className="text-center py-4 bg-slate-50 rounded-xl mb-6 border border-slate-100">
                                <div className="text-6xl font-mono font-bold tracking-wider mb-2 text-slate-900">
                                    {formatTime(timerLeft)}
                                </div>
                                <div className="flex justify-center gap-2">
                                    {['FOCUS', 'SHORT', 'LONG'].map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => switchTimerMode(mode as any)}
                                            className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${timerMode === mode ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-center gap-4 mb-6">
                                <button
                                    onClick={() => setIsTimerActive(!isTimerActive)}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 ${isTimerActive ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                >
                                    {isTimerActive ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                                </button>
                                <button
                                    onClick={handleTimerReset}
                                    className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 flex items-center justify-center transition-all"
                                >
                                    <RotateCcw size={20} />
                                </button>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="text-xs text-slate-500 mb-2 font-medium uppercase">Productivity Sessions</div>
                                <div className="flex flex-wrap gap-1">
                                    {[...Array(formData.pomodoroSessions || 0)].map((_, i) => (
                                        <span key={i} title="25m Focus Session Completed">🍅</span>
                                    ))}
                                    {(formData.pomodoroSessions === 0) && <span className="text-xs text-slate-400">No completed sessions yet.</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Meta Properties */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-5">
                        {/* Status */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                            <div className="relative">
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none outline-none transition-all font-medium"
                                >
                                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${STATUS_COLORS[formData.status as TaskStatus].split(' ')[0]}`}></div>
                            </div>
                        </div>

                        {/* Priority */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value as Priority })}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                            >
                                {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        {/* Assignees (Multi-Select) */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><User size={12} /> Assignees</label>
                            <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto bg-slate-50">
                                {members.map(m => {
                                    const isSelected = formData.assigneeIds?.includes(m.id);
                                    return (
                                        <div
                                            key={m.id}
                                            onClick={() => toggleAssignee(m.id)}
                                            className={`flex items-center gap-2 p-2 cursor-pointer text-sm transition-colors hover:bg-slate-100 ${isSelected ? 'bg-indigo-50' : ''}`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                                                {isSelected && <span className="text-white text-[10px]">✓</span>}
                                            </div>
                                            <img src={m.avatarUrl} className="w-5 h-5 rounded-full" />
                                            <span className={isSelected ? 'text-indigo-700 font-medium' : 'text-slate-600'}>{m.name}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Project Link */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Tag size={12} /> Project</label>
                            <select
                                value={formData.projectId || ''}
                                onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="">No Project</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        {/* Due Date */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={12} /> Due Date</label>
                            <input
                                type="date"
                                value={formData.dueDate}
                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>

                        {/* Archive Task */}
                        {!isNew && (
                            <div className="pt-4 border-t border-slate-100">
                                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={formData.status === TaskStatus.ARCHIVED}
                                        onChange={async (e) => {
                                            const newStatus = e.target.checked ? TaskStatus.ARCHIVED : (existingTask?.status === TaskStatus.ARCHIVED ? TaskStatus.TODO : existingTask?.status || TaskStatus.TODO);
                                            const updatedFormData = {
                                                ...formData,
                                                status: newStatus
                                            };
                                            setFormData(updatedFormData);

                                            // Auto-save and navigate if archiving
                                            if (e.target.checked && existingTask) {
                                                try {
                                                    const taskData: Task = {
                                                        ...existingTask,
                                                        ...updatedFormData,
                                                        status: TaskStatus.ARCHIVED,
                                                        updatedAt: new Date().toISOString(),
                                                    };
                                                    await updateTask(taskData);
                                                    navigate('/archive');
                                                } catch (error) {
                                                    console.error("Failed to archive task", error);
                                                }
                                            }
                                        }}
                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                    />
                                    <div>
                                        <span className="font-semibold text-slate-900 block text-xs">Archive Task</span>
                                        <span className="text-[10px] text-slate-500">Task will be moved to Archive.</span>
                                    </div>
                                </label>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Task"
                message="Are you sure you want to delete this task? This action cannot be undone."
                confirmText="Delete Task"
                isDangerous={true}
                isLoading={isSaving}
            />
        </div>
    );
};