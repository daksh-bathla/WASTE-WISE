import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ExternalLink, Pause, Play, Share2, ShieldAlert, Star, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AppLayout from '../components/AppLayout';
import { Badge, Button, Card, Modal, ProgressBar } from '../components/ui';
import { communityApi, voiceApi } from '../utils/backendApi';

const buildVoiceText = (suggestion) => {
  const steps = (suggestion.steps || [])
    .map((step, index) => {
      const text = typeof step === 'string'
        ? step
        : step?.text || step?.instruction || step?.description || step?.title;
      return text ? `Step ${index + 1}. ${text}` : null;
    })
    .filter(Boolean)
    .join(' ');

  const safety = [
    suggestion.disclaimer?.who,
    suggestion.disclaimer?.stop,
    suggestion.disclaimer?.notes,
  ].filter(Boolean).join(' ');

  return [
    suggestion.title,
    suggestion.personalisation,
    steps,
    safety ? `Safety note. ${safety}` : '',
  ].filter(Boolean).join('. ');
};

export default function SuggestionPage() {
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userReview, setUserReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(null);
  const audioRef = useRef(null);

  const { suggestionId, scanId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get suggestion from router state (passed from ResultsPage)
  const suggestion = useMemo(() => {
    const fromState = location.state?.suggestion;
    if (fromState && String(fromState.id) === String(suggestionId)) return fromState;
    // Fallback: use raw data if available
    if (fromState) return fromState;
    return {
      id: suggestionId,
      title: 'Suggestion details',
      moduleType: 'General',
      tagColor: 'purple',
      component: 'Component',
      credibility: 'Community',
      sourceName: 'WasteWise',
      sourceUrl: '#',
      rating: '0.0',
      tried: 0,
      personalisation: 'This suggestion is personalized for your profile.',
      region: 'India',
      steps: [{ title: 'Loading', text: 'Details are loading...' }],
      disclaimer: { who: '', stop: '', notes: '', patch: false },
    };
  }, [suggestionId, location.state]);

  const itemName = location.state?.scan?.input_type || 'your item';
  const shareText = `I turned my ${itemName} into ${suggestion.title} using WasteWise. Try it: wastewise.in`;
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const voiceText = useMemo(() => buildVoiceText(suggestion), [suggestion]);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const handleSubmitRating = async () => {
    setSubmittingRating(true);
    try {
      await communityApi.rate({
        suggestion_id: suggestion.id,
        rating: userRating,
        review: userReview,
        tried_it: true,
      });
      setRatingOpen(false);
      toast.success('Thanks for rating');
    } catch (error) {
      console.error('Rating error:', error);
      setRatingOpen(false);
      toast.success('Thanks for rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const playBrowserSpeech = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) {
      toast.error('Voice playback is not supported in this browser');
      return false;
    }

    audioRef.current?.pause();
    window.speechSynthesis.cancel();

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 1;
    utterance.onend = () => {
      setPlaying(false);
      setVoiceMode(null);
    };
    utterance.onerror = (event) => {
      setPlaying(false);
      setVoiceMode(null);
      if (!['canceled', 'interrupted'].includes(event.error)) {
        toast.error('Voice playback failed');
      }
    };

    setVoiceMode('browser');
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
    return true;
  };

  const handlePlayToggle = async () => {
    if (playing) {
      if (voiceMode === 'browser' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      } else {
        audioRef.current?.pause();
      }
      setPlaying(false);
      setVoiceMode(null);
    } else {
      if (audioUrl && audioRef.current) {
        try {
          setVoiceMode('audio');
          await audioRef.current.play();
          setPlaying(true);
        } catch (err) {
          console.error('Audio playback error:', err);
          playBrowserSpeech(voiceText);
        }
      } else {
        setVoiceLoading(true);
        try {
          const res = await voiceApi.generate({ suggestion_id: suggestion.id, language: 'en' });
          const fallbackText = res?.text || voiceText;

          if (res?.fallback || !res?.audio) {
            playBrowserSpeech(fallbackText);
            return;
          }

          const url = `data:${res.mimeType || 'audio/mpeg'};base64,${res.audio}`;
          setAudioUrl(url);

          if (audioRef.current) {
            audioRef.current.src = url;
            setVoiceMode('audio');
            await audioRef.current.play();
            setPlaying(true);
          } else {
            playBrowserSpeech(fallbackText);
          }
        } catch (err) {
          console.error('Voice generation error:', err);
          if (!playBrowserSpeech(voiceText)) {
            toast.error('Failed to generate voice');
          }
        } finally {
          setVoiceLoading(false);
        }
      }
    }
  };

  return (
    <AppLayout>
      <div className="page-shell section-compact">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm font-bold text-text-muted">
          <button type="button" onClick={() => navigate(`/results/${scanId}`)} className="hover:text-deep-purple">Results</button>
          <ChevronRight size={15} />
          <span className="text-text-primary">{suggestion.title}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-6">
            <Card className="p-7">
              <Badge color={suggestion.tagColor} className="mb-5">{suggestion.moduleType}</Badge>
              <h1 className="text-[clamp(2rem,5vw,3.6rem)]">{suggestion.title}</h1>
              <div className="mt-5 rounded-2xl border border-primary-green bg-white p-4 shadow-sm">
                <p className="text-sm font-bold text-deep-green">Why this suits you right now</p>
                <p className="mt-1 leading-7">{suggestion.personalisation}</p>
              </div>
            </Card>

            <Card>
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="input-label">Source</p>
                  <h3>{suggestion.sourceName}</h3>
                  <p className="mt-2 text-sm">Credibility: {suggestion.credibility}</p>
                </div>
                <a href={suggestion.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                  Open source <ExternalLink size={15} />
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge color="neutral">{suggestion.region}</Badge>
                <Badge color="green">Component: {suggestion.component}</Badge>
              </div>
            </Card>

            {suggestion.ingredients && (
              <Card>
                <h3>Preparation</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <InfoList title="Ingredients" items={suggestion.ingredients} />
                  <InfoList title="Equipment" items={suggestion.equipment} />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge color="purple">Time: {suggestion.estimatedTime}</Badge>
                  <Badge color="warning">Shelf life: {suggestion.shelfLife}</Badge>
                </div>
              </Card>
            )}

            <Card>
              <h2 className="text-3xl">How to do it</h2>
              <div className="mt-6 grid gap-5">
                {(suggestion.steps || []).map((step, index) => (
                  <div key={step.title || index} className="grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-[44px_1fr]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-deep-purple text-sm font-extrabold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-lg">{step.title}</h3>
                      <p className="mt-2 leading-7">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 text-left"
                onClick={() => setSafetyOpen((current) => !current)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF0EE] text-danger">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <h3>Safety information</h3>
                    <p className="text-sm">Read before trying this suggestion.</p>
                  </div>
                </div>
                <Badge color={safetyOpen ? 'danger' : 'warning'}>{safetyOpen ? 'Open' : 'View'}</Badge>
              </button>
              {safetyOpen && (
                <div className="mt-6 grid gap-4">
                  <SafetyRow title="Who should not use this" text={suggestion.disclaimer?.who} />
                  <SafetyRow title="When to stop immediately" text={suggestion.disclaimer?.stop} />
                  <SafetyRow title="Safety notes" text={suggestion.disclaimer?.notes} />
                  {suggestion.disclaimer?.patch && (
                    <div className="rounded-2xl border border-warning bg-[#FFF5EE] p-4 font-bold text-text-primary">
                      Patch test required before full use.
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          <aside className="grid h-fit gap-6">
            <Card>
              <h3>Voice guidance</h3>
              <p className="mt-2 text-sm">Listen to the steps in your selected language.</p>
              <div className="mt-5 rounded-2xl border border-border bg-light-purple p-4">
                <div className="mb-4 flex items-center gap-3">
                  <button
                    type="button"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-deep-purple text-white"
                    onClick={handlePlayToggle}
                    disabled={voiceLoading}
                    aria-label={playing ? 'Pause guidance' : 'Play guidance'}
                  >
                    {voiceLoading ? <div className="spinner spinner-sm" /> : (playing ? <Pause size={20} /> : <Play size={20} />)}
                  </button>
                  <div>
                    <p className="font-bold text-text-primary">{playing ? 'Playing guidance' : 'Ready to listen'}</p>
                    <p className="text-xs font-bold text-text-muted">English</p>
                  </div>
                </div>
                <ProgressBar percentage={playing ? 46 : 0} />
                <div className="mt-4 flex gap-2">
                  {['0.75x', '1x', '1.25x', '1.5x'].map((speed) => (
                    <button key={speed} type="button" className={`badge ${speed === '1x' ? 'badge-purple' : 'badge-neutral'}`}>{speed}</button>
                  ))}
                </div>
              </div>
              <Button variant="primary" className="mt-4 w-full" onClick={handlePlayToggle} loading={voiceLoading}>
                <Volume2 size={17} /> {playing ? 'Pause' : 'Listen'}
              </Button>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3>Community</h3>
                <div className="flex items-center gap-1 font-extrabold text-text-primary">
                  <Star size={16} className="fill-warning text-warning" /> {suggestion.rating}
                </div>
              </div>
              <p className="text-sm">{suggestion.tried} people tried this suggestion.</p>
              <Button variant="secondary" className="mt-4 w-full" onClick={() => setRatingOpen(true)}>
                I tried this
              </Button>
            </Card>

            <Card>
              <h3>Share</h3>
              <p className="mt-2 text-sm">Send this idea to someone who can use it.</p>
              <a href={shareUrl} target="_blank" rel="noreferrer" className="btn btn-success btn-md mt-4 w-full">
                <Share2 size={17} /> Share on WhatsApp
              </a>
            </Card>
          </aside>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl || ''}
        onEnded={() => {
          setPlaying(false);
          setVoiceMode(null);
        }}
        onError={() => {
          if (voiceMode === 'audio') {
            setPlaying(false);
            setVoiceMode(null);
            playBrowserSpeech(voiceText);
          }
        }}
        className="hidden"
      />

      <Modal isOpen={ratingOpen} onClose={() => setRatingOpen(false)} title="Rate this suggestion" size="md">
        <div className="space-y-5">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" className="text-warning" onClick={() => setUserRating(star)}>
                <Star size={28} className={star <= userRating ? 'fill-warning' : ''} />
              </button>
            ))}
          </div>
          <textarea
            className="input-field min-h-[110px]"
            placeholder="How did it work for you?"
            maxLength={200}
            value={userReview}
            onChange={(e) => setUserReview(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRatingOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmitRating} loading={submittingRating}>Post rating</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

function InfoList({ title, items = [] }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <h4>{title}</h4>
      <ul className="mt-3 grid gap-2 text-sm text-text-secondary">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function SafetyRow({ title, text }) {
  if (!text) return null;
  return (
    <div className="rounded-2xl border border-border p-4">
      <h4>{title}</h4>
      <p className="mt-2 text-sm leading-6">{text}</p>
    </div>
  );
}
