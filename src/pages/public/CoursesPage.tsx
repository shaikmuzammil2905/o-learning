import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { CourseCard } from '../../components/CourseCard';
import { EmptyState } from '../../components/ui/StateViews';
import { RevealOnScroll } from '../../components/ui/Animations';
import { useSite } from '../../context/SiteContext';

export function CoursesPage() {
  const { courses: allCourses, categories } = useSite();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');

  const courses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCourses.filter((c) => {
      const catMatch =
        category === 'all' ||
        c.category_slug === category ||
        String(c.category_id) === category;
      const searchMatch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.short_description.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q);
      return catMatch && searchMatch;
    });
  }, [allCourses, category, search]);

  const handleCategoryChange = (slug: string) => {
    setCategory(slug);
    if (slug === 'all') searchParams.delete('category');
    else searchParams.set('category', slug);
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <PublicLayout>
      <section className="bg-gradient-to-r from-[#00338D] to-[#0052CC] text-white py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll>
            <h1 className="font-display font-extrabold text-2xl sm:text-4xl">
              Explore Our Courses & Programs
            </h1>
            <p className="text-sm sm:text-base text-blue-100 mt-2 max-w-2xl">
              Structured video lessons, live mentor classes, downloadable study notes, and practice mock tests — built for career & exam success.
            </p>
          </RevealOnScroll>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Spoken English, UPSC, JEE, Python, Java…"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-slate-900 text-sm outline-none shadow-sm"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Category:
          </span>
          <button
            type="button"
            onClick={() => handleCategoryChange('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition cursor-pointer ${
              category === 'all'
                ? 'bg-[#0052CC] text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Programs
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => handleCategoryChange(cat.slug)}
              className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition cursor-pointer ${
                category === cat.slug
                  ? 'bg-[#0052CC] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {courses.length === 0 ? (
          <EmptyState
            title="No matching courses found"
            description="Try clearing your search filter or exploring another category."
            action={
              <button
                onClick={() => {
                  setSearch('');
                  handleCategoryChange('all');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#0052CC] text-white text-xs font-bold cursor-pointer"
              >
                Show All Courses
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course, idx) => (
              <RevealOnScroll key={course.id} delay={idx * 50}>
                <CourseCard course={course} />
              </RevealOnScroll>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
