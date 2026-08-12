import { useEffect, useState } from 'react';
import { Star, TrendingUp, Users } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { Badge, Card, EmptyState, PageHeader } from '../components/ui';
import { communityApi } from '../utils/backendApi';

const filters = ['All', 'Most rated', 'This week'];

export default function CommunityPage() {
  const [posts, setPosts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      try {
        const filterStr = activeFilter === 'This week' ? 'this_week' : null;
        const sortStr = activeFilter === 'Most rated' ? 'most_rated' : 'latest';
        const data = await communityApi.feed(20, 0, filterStr, sortStr);
        if (data && data.posts) {
          setPosts(data.posts);
        }
      } catch (error) {
        console.error('Failed to fetch community feed:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, [activeFilter]);

  return (
    <AppLayout>
      <div className="page-shell section-compact">
        <PageHeader
          eyebrow="Community"
          title="What others are making"
          subtitle="Real household reuse results from WasteWise users across India."
        />

        <div className="mb-7 flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`badge shrink-0 ${activeFilter === filter ? 'badge-purple' : 'badge-neutral'}`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-5">
            {loading && posts.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Loading posts…"
                description="Fetching the latest community reuse results from across India."
              />
            ) : posts.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No posts yet"
                description="Be the first to share a reuse result with the WasteWise community."
              />
            ) : posts.map((post) => (
              <Card key={post.id} hoverable>
                <div className="grid gap-5 sm:grid-cols-[112px_1fr]">
                  <div className="flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-light-purple to-light-green overflow-hidden">
                    {post.photo_url ? (
                      <img src={post.photo_url} alt="User submission" className="w-full h-full object-cover" />
                    ) : (
                      <Users size={34} className="text-deep-purple" />
                    )}
                  </div>
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge color="purple">{post.module_type || 'General'}</Badge>
                      <span className="text-xs font-bold text-text-muted">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="capitalize">{post.suggestion_title || 'Community Suggestion'}</h3>
                    <p className="mt-2 text-sm capitalize">Made from {post.item_used || post.component_name || 'an item'}</p>
                    {post.review && <p className="mt-1 text-sm italic text-text-secondary">"{post.review}"</p>}
                    <p className="mt-1 text-sm font-bold text-text-secondary">
                      {post.user_name || 'WasteWise User'} {post.user_city ? `, ${post.user_city}` : ''}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-bold">
                      <span className="flex items-center gap-1 text-text-primary">
                        <Star size={16} className="fill-warning text-warning" /> {post.rating}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <aside className="grid h-fit gap-6">
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <TrendingUp size={22} className="text-deep-purple" />
                <h3>Top cities this month</h3>
              </div>
              {['Delhi', 'Pune', 'Jaipur', 'Kochi', 'Bengaluru'].map((city, index) => (
                <div key={city} className={`flex items-center justify-between border-b border-border py-3 last:border-0 ${city === 'Delhi' ? 'text-deep-purple' : ''}`}>
                  <span className="font-bold">{index + 1}. {city}</span>
                  <span className="text-sm font-bold text-text-muted">{92 - index * 11}</span>
                </div>
              ))}
            </Card>
            <Card>
              <h3>Trending this week</h3>
              <div className="mt-4 grid gap-3">
                {['Curd hair mask', 'Seedling tray', 'Coconut oil polish', 'Banana peel compost'].map((item) => (
                  <div key={item} className="rounded-2xl bg-light-purple p-3 text-sm font-bold text-text-primary">{item}</div>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
