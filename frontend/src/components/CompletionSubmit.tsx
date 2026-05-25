import { useState } from 'react';
import '../styles/CompletionSubmit.scss';

interface Props {
  demonId: string;
  onSubmit: (videoLink: string) => Promise<void>;
}

export default function CompletionSubmit({ onSubmit }: Props) {
  const [videoLink, setVideoLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoLink.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(videoLink);
      setVideoLink('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="completion-submit" onSubmit={handleSubmit}>
      <input
        type="url"
        placeholder="YouTube link..."
        value={videoLink}
        onChange={(e) => setVideoLink(e.target.value)}
        disabled={submitting}
      />
      <button type="submit" disabled={submitting || !videoLink.trim()}>
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
      {submitted && <span className="success">✓ Submitted!</span>}
    </form>
  );
}
