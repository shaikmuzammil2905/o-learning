import React, { useEffect, useState } from 'react';
import { BookOpen, IndianRupee, Image as ImageIcon, Layers, Plus, Save, Star, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { ImageUploader } from './ImageUploader';

export interface AdminCategoryOption {
  id: number;
  name: string;
  slug: string;
}

export interface AdminFacultyOption {
  id: number;
  full_name: string;
}

interface LessonItem {
  id: number;
  module_id: number;
  title: string;
  lesson_type: string;
  video_url: string;
  material_url: string;
  duration_minutes: number;
  is_preview: number;
}

interface ModuleItem {
  id: number;
  title: string;
  description: string;
  lessons: LessonItem[];
}

export interface CourseEditorInitial {
  id?: number;
  title?: string;
  category_id?: number | string | null;
  short_description?: string;
  description?: string;
  level?: string;
  duration?: string;
  language?: string;
  prerequisites?: string;
  price?: number;
  discount_price?: number | null;
  is_free?: number;
  is_published?: number;
  featured?: number;
  faculty_id?: number | string | null;
  thumbnail_url?: string;
  banner_image?: string;
  preview_image?: string;
  instructor_image?: string;
  what_you_learn?: string[];
}

export const AdminCourseModal: React.FC<{
  open: boolean;
  initial: CourseEditorInitial | null;
  categories: AdminCategoryOption[];
  faculty: AdminFacultyOption[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, initial, categories, faculty, onClose, onSaved }) => {
  const [tab, setTab] = useState<'basic' | 'pricing' | 'media' | 'curriculum'>('basic');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [courseId, setCourseId] = useState<number | null>(null);

  const [form, setForm] = useState({
    title: '',
    category_id: '',
    short_description: '',
    description: '',
    level: 'All Levels',
    duration: '12 Weeks',
    language: 'English / Bilingual',
    prerequisites: 'None required — beginner friendly',
    price: 1999,
    discount_price: '' as string | number,
    is_free: false,
    is_published: true,
    featured: false,
    faculty_id: '',
    thumbnail_url: '/courses/spoken-english.png',
    banner_image: '',
    preview_image: '',
    instructor_image: '',
    what_you_learn: '',
  });

  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [newModTitle, setNewModTitle] = useState('');
  const [newLessonByMod, setNewLessonByMod] = useState<
    Record<number, { title: string; lesson_type: string; video_url: string; duration_minutes: number; is_preview: boolean }>
  >({});

  useEffect(() => {
    if (!open) return;
    setTab('basic');
    setError('');
    if (initial?.id) {
      setCourseId(initial.id);
      setForm({
        title: initial.title || '',
        category_id: initial.category_id ? String(initial.category_id) : categories[0]?.id ? String(categories[0].id) : '',
        short_description: initial.short_description || '',
        description: initial.description || '',
        level: initial.level || 'All Levels',
        duration: initial.duration || '12 Weeks',
        language: initial.language || 'English / Bilingual',
        prerequisites: initial.prerequisites || '',
        price: Number(initial.price ?? 1999),
        discount_price: initial.discount_price !== null && initial.discount_price !== undefined ? initial.discount_price : '',
        is_free: Boolean(initial.is_free),
        is_published: initial.is_published !== 0,
        featured: Boolean(initial.featured),
        faculty_id: initial.faculty_id ? String(initial.faculty_id) : faculty[0]?.id ? String(faculty[0].id) : '',
        thumbnail_url: initial.thumbnail_url || '/courses/spoken-english.png',
        banner_image: initial.banner_image || '',
        preview_image: initial.preview_image || '',
        instructor_image: initial.instructor_image || '',
        what_you_learn: Array.isArray(initial.what_you_learn) ? initial.what_you_learn.join('\n') : '',
      });
      loadCurriculum(initial.id);
    } else {
      setCourseId(null);
      setModules([]);
      setForm({
        title: '',
        category_id: categories[0]?.id ? String(categories[0].id) : '',
        short_description: '',
        description: '',
        level: 'All Levels',
        duration: '12 Weeks',
        language: 'English / Bilingual',
        prerequisites: 'No prerequisites required',
        price: 1999,
        discount_price: 999,
        is_free: false,
        is_published: true,
        featured: false,
        faculty_id: faculty[0]?.id ? String(faculty[0].id) : '',
        thumbnail_url: '/courses/spoken-english.png',
        banner_image: '',
        preview_image: '',
        instructor_image: '',
        what_you_learn: 'Core foundations & structured modules\nPractice quizzes & certification\nLive mentor Q&A sessions',
      });
    }
  }, [open, initial, categories, faculty]);

  const loadCurriculum = async (id: number) => {
    try {
      const mods = await api<ModuleItem[]>(`/api/admin/courses/${id}/modules`);
      setModules(mods);
    } catch {
      setModules([]);
    }
  };

  if (!open) return null;

  const saveCourse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.title.trim()) {
      setError('Course title is required.');
      setTab('basic');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        category_id: form.category_id ? Number(form.category_id) : null,
        faculty_id: form.faculty_id ? Number(form.faculty_id) : null,
        price: form.is_free ? 0 : Number(form.price || 0),
        discount_price: form.is_free || form.discount_price === '' ? null : Number(form.discount_price),
        is_free: form.is_free ? 1 : 0,
        is_published: form.is_published ? 1 : 0,
        featured: form.featured ? 1 : 0,
        what_you_learn: form.what_you_learn
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      if (courseId) {
        await api(`/api/admin/courses/${courseId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        const created = await api<{ id: number }>('/api/admin/courses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setCourseId(created.id);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Could not save course.');
    } finally {
      setSaving(false);
    }
  };

  const addModule = async () => {
    if (!courseId || !newModTitle.trim()) return;
    await api(`/api/admin/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify({ title: newModTitle.trim() }),
    });
    setNewModTitle('');
    loadCurriculum(courseId);
  };

  const deleteModule = async (mid: number) => {
    await api(`/api/admin/modules/${mid}`, { method: 'DELETE' });
    if (courseId) loadCurriculum(courseId);
  };

  const addLesson = async (modId: number) => {
    const draft = newLessonByMod[modId];
    if (!courseId || !draft?.title?.trim()) return;
    await api(`/api/admin/modules/${modId}/lessons`, {
      method: 'POST',
      body: JSON.stringify({
        course_id: courseId,
        title: draft.title.trim(),
        lesson_type: draft.lesson_type || 'video',
        video_url: draft.video_url || '',
        duration_minutes: Number(draft.duration_minutes || 25),
        is_preview: draft.is_preview ? 1 : 0,
      }),
    });
    setNewLessonByMod((prev) => ({
      ...prev,
      [modId]: { title: '', lesson_type: 'video', video_url: '', duration_minutes: 25, is_preview: false },
    }));
    loadCurriculum(courseId);
  };

  const deleteLesson = async (lid: number) => {
    await api(`/api/admin/lessons/${lid}`, { method: 'DELETE' });
    if (courseId) loadCurriculum(courseId);
  };

  const inputCls =
    'w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#FF7A00] focus:outline-none';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0F172A] text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              {courseId ? 'Edit Course' : 'Create New Course'}
            </h2>
            <p className="text-xs text-slate-400">
              Manage curriculum, pricing, media uploads, and publishing status
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-800 bg-slate-900/50 px-5 pt-2.5 overflow-x-auto">
          {[
            { id: 'basic', label: 'Basic Info', icon: BookOpen },
            { id: 'pricing', label: 'Pricing & Status', icon: IndianRupee },
            { id: 'media', label: 'Media Assets', icon: ImageIcon },
            { id: 'curriculum', label: `Curriculum (${modules.length})`, icon: Layers },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as typeof tab)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                  active
                    ? 'border-[#FF7A00] bg-slate-800/80 text-[#FF7A00]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={saveCourse} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300">
              {error}
            </div>
          )}

          {tab === 'basic' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Course Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Spoken English Mastery"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Category</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className={inputCls}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Lead Instructor</label>
                <select
                  value={form.faculty_id}
                  onChange={(e) => setForm({ ...form, faculty_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Platform Faculty Team</option>
                  {faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Duration</label>
                <input
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  placeholder="e.g., 12 Weeks"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Level</label>
                <select
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                  className={inputCls}
                >
                  <option>Beginner to Advanced</option>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                  <option>All Levels</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Language</label>
                <input
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Prerequisites</label>
                <input
                  value={form.prerequisites}
                  onChange={(e) => setForm({ ...form, prerequisites: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>Short Summary</label>
                <input
                  value={form.short_description}
                  onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                  placeholder="Crisp 1-2 line overview shown on course cards"
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>Detailed Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>What Learners Will Master (one bullet per line)</label>
                <textarea
                  rows={3}
                  value={form.what_you_learn}
                  onChange={(e) => setForm({ ...form, what_you_learn: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {tab === 'pricing' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-wrap gap-6">
                <label className="inline-flex items-center gap-2.5 text-sm font-semibold text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_free}
                    onChange={(e) => setForm({ ...form, is_free: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#FF7A00]"
                  />
                  Free Course (₹0)
                </label>
                <label className="inline-flex items-center gap-2.5 text-sm font-semibold text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#FF7A00]"
                  />
                  Published on Public Catalog
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#FF7A00]"
                  />
                  <Star className="h-4 w-4" /> Mark as Featured Course
                </label>
              </div>

              {!form.is_free && (
                <>
                  <div>
                    <label className={labelCls}>MRP / Regular Price (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Offer / Selling Price (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.discount_price}
                      onChange={(e) =>
                        setForm({ ...form, discount_price: e.target.value === '' ? '' : Number(e.target.value) })
                      }
                      placeholder="Leave blank if no discount"
                      className={inputCls}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'media' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <ImageUploader
                label="Course Thumbnail *"
                value={form.thumbnail_url}
                onChange={(url) => setForm({ ...form, thumbnail_url: url })}
                folder="o-learning/courses/thumbnails"
              />
              <ImageUploader
                label="Course Hero Banner"
                value={form.banner_image}
                onChange={(url) => setForm({ ...form, banner_image: url })}
                folder="o-learning/courses/banners"
              />
              <ImageUploader
                label="Preview Video Poster"
                value={form.preview_image}
                onChange={(url) => setForm({ ...form, preview_image: url })}
                folder="o-learning/courses/previews"
              />
              <ImageUploader
                label="Instructor Portrait"
                value={form.instructor_image}
                onChange={(url) => setForm({ ...form, instructor_image: url })}
                folder="o-learning/instructors"
                aspectClass="aspect-[4/3]"
              />
            </div>
          )}

          {tab === 'curriculum' && (
            <div className="space-y-4">
              {!courseId ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                  Save the course first (using the Save Course button below) to attach modules and lessons directly,
                  or save Basic Info and reopen Edit to build modules.
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      value={newModTitle}
                      onChange={(e) => setNewModTitle(e.target.value)}
                      placeholder="New module title (e.g., Module 1: Grammar Foundations)"
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={addModule}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#FF7A00] px-4 py-2 text-xs font-bold text-white hover:bg-orange-500 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" /> Add Module
                    </button>
                  </div>

                  {modules.map((mod) => {
                    const draft = newLessonByMod[mod.id] || {
                      title: '',
                      lesson_type: 'video',
                      video_url: '',
                      duration_minutes: 25,
                      is_preview: false,
                    };
                    return (
                      <div key={mod.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-sm text-white">{mod.title}</h4>
                          <button
                            type="button"
                            onClick={() => deleteModule(mod.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove Module
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {mod.lessons.map((l) => (
                            <div
                              key={l.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-200">{l.title}</span>
                                <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">
                                  {l.lesson_type} · {l.duration_minutes}m
                                </span>
                                {l.is_preview === 1 && (
                                  <span className="ml-1.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                    FREE PREVIEW
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteLesson(l.id)}
                                className="text-rose-400 hover:text-rose-300 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-5 pt-2 border-t border-slate-800/80">
                          <input
                            value={draft.title}
                            onChange={(e) =>
                              setNewLessonByMod({ ...newLessonByMod, [mod.id]: { ...draft, title: e.target.value } })
                            }
                            placeholder="Lesson title"
                            className={`${inputCls} sm:col-span-2 py-1.5 text-xs`}
                          />
                          <select
                            value={draft.lesson_type}
                            onChange={(e) =>
                              setNewLessonByMod({
                                ...newLessonByMod,
                                [mod.id]: { ...draft, lesson_type: e.target.value },
                              })
                            }
                            className={`${inputCls} py-1.5 text-xs`}
                          >
                            <option value="video">Video</option>
                            <option value="material">PDF Notes</option>
                            <option value="assignment">Assignment</option>
                          </select>
                          <input
                            value={draft.video_url}
                            onChange={(e) =>
                              setNewLessonByMod({ ...newLessonByMod, [mod.id]: { ...draft, video_url: e.target.value } })
                            }
                            placeholder="Video / Resource URL"
                            className={`${inputCls} py-1.5 text-xs`}
                          />
                          <button
                            type="button"
                            onClick={() => addLesson(mod.id)}
                            className="rounded-xl bg-[#0052CC] px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-600 cursor-pointer"
                          >
                            + Lesson
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/70 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveCourse()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-5 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-500 disabled:opacity-60 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : courseId ? 'Save Changes' : 'Create Course'}
          </button>
        </div>
      </div>
    </div>
  );
};
