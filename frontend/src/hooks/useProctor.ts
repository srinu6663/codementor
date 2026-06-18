import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/api';

interface ProctorOpts {
  active: boolean;
  assignmentId: string | null;
  problemId?: string;
  onAutoSubmit: () => void;
}

const MAX_FS_EXITS = 3;

export function useProctor({ active, assignmentId, problemId, onAutoSubmit }: ProctorOpts) {
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState<boolean>(!!document.fullscreenElement);

  const fsExits = useRef(0);
  const submitted = useRef(false);
  const cbRef = useRef(onAutoSubmit);
  cbRef.current = onAutoSubmit;

  const log = useCallback((event_type: string, detail?: string) => {
    api.post('/api/proctor/event', {
      assignment_id: assignmentId, problem_id: problemId, event_type, detail,
    }).catch(() => {});
  }, [assignmentId, problemId]);

  const requestFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    if (!active) return;
    log('exam_start');
    requestFullscreen();

    const onVis = () => {
      if (document.hidden) {
        setViolations(v => v + 1);
        setWarning('You left the exam tab — this has been recorded.');
        log('tab_switch');
      }
    };
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setFullscreen(fs);
      if (!fs) {
        fsExits.current += 1;
        setViolations(v => v + 1);
        log('fullscreen_exit', `exit #${fsExits.current}`);
        if (fsExits.current >= MAX_FS_EXITS && !submitted.current) {
          submitted.current = true;
          setWarning('Fullscreen exited 3 times — your exam is being submitted automatically.');
          log('auto_submit');
          cbRef.current();
        } else {
          setWarning(`Return to fullscreen to continue the exam (${fsExits.current}/${MAX_FS_EXITS}).`);
        }
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      setViolations(v => v + 1);
      log('paste', `${String(e.clipboardData?.getData('text') || '').length} chars`);
    };
    const onCopy = () => log('copy');

    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('paste', onPaste, true);
    document.addEventListener('copy', onCopy, true);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('paste', onPaste, true);
      document.removeEventListener('copy', onCopy, true);
    };
  }, [active, assignmentId, problemId, log, requestFullscreen]);

  return { violations, warning, fullscreen, requestFullscreen, dismissWarning: () => setWarning(null) };
}
