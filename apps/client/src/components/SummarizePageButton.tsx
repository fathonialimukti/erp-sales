import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, Modal, ModalHeader, ModalBody, Spinner } from '../ui';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SummarizePageButtonProps {
  contextData: Record<string, unknown>;
  recordData?: unknown;
}

export const SummarizePageButton = ({ contextData, recordData }: SummarizePageButtonProps) => {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  const handleSummarize = async () => {
    setOpen(true);
    setLoading(true);
    setSummary('');
    setError('');

    try {
      const res = await fetch('http://localhost:10022/api/ai/summarize', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: contextData.section ?? 'unknown',
          contextJson: JSON.stringify(contextData),
          recordJson: recordData ? JSON.stringify(recordData) : undefined,
        }),
      });

      if (!res.ok) throw new Error('Summarize failed');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setSummary(accumulated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleSummarize}
        className="fixed bottom-6 right-6 z-10 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl"
      >
        {intl.formatMessage({ id: 'common.action.summarize_page', defaultMessage: 'Summarize this page' })}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} size="xl">
        <ModalHeader onClose={() => setOpen(false)}>
          {intl.formatMessage({ id: 'common.action.summarize_page', defaultMessage: 'Summarize this page' })}
        </ModalHeader>
        <ModalBody>
          {loading && <Spinner />}
          {error && <p className="text-red-600">{error}</p>}
          {summary && (
            <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
              {summary}
            </ReactMarkdown>
          )}
        </ModalBody>
      </Modal>
    </>
  );
};
