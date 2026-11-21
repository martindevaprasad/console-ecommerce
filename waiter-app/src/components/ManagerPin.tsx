import React, { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { ApiError } from '@/lib/api';
import { PinPad } from './PinPad';
import { Button, Sheet, toast } from './ui';

type Runner = (approverPin?: string) => Promise<any>;

/**
 * Runs an action; if the server answers APPROVAL_REQUIRED (void, transfer,
 * big discount…), asks for a manager PIN on the spot and retries with it.
 * Mirrors the POS terminal's manager-override flow.
 */
export function useManagerApproval() {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const pending = useRef<{ run: Runner; resolve: (v: any) => void } | null>(null);

  const withApproval = useCallback(<T,>(run: (approverPin?: string) => Promise<T>): Promise<T | undefined> => {
    return new Promise((resolve) => {
      run()
        .then(resolve)
        .catch((e: any) => {
          if (e instanceof ApiError && e.code === 'APPROVAL_REQUIRED') {
            pending.current = { run, resolve };
            setReason(e.message.replace(/\s*\(.+\)$/, ''));
            setPin('');
            setError(false);
            setOpen(true);
          } else {
            toast.error(e.message || 'Something went wrong');
            resolve(undefined);
          }
        });
    });
  }, []);

  const submit = async (value: string) => {
    if (!pending.current || value.length < 4) return;
    setBusy(true);
    try {
      const res = await pending.current.run(value);
      setOpen(false);
      pending.current.resolve(res);
      pending.current = null;
    } catch (e: any) {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 600);
      if (!(e instanceof ApiError) || e.code !== 'FORBIDDEN') toast.error(e.message);
      else setReason(e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setOpen(false);
    pending.current?.resolve(undefined);
    pending.current = null;
  };

  const element = (
    <Sheet visible={open} onClose={cancel} title="Manager approval" subtitle={reason || 'A manager needs to enter their PIN'} scroll={false}>
      <View className="items-center py-4">
        <PinPad value={pin} onChange={setPin} length={0} error={error} />
        <View className="mt-6 w-[288px] flex-row gap-3">
          <Button title="Cancel" variant="secondary" className="flex-1" onPress={cancel} />
          <Button title="Approve" className="flex-1" loading={busy} disabled={pin.length < 4} onPress={() => submit(pin)} />
        </View>
        <Text className="mt-3 text-[12px] text-ink-muted">The approval is recorded in the POS audit log.</Text>
      </View>
    </Sheet>
  );

  return { withApproval, element };
}
