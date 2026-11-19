'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { PHOTO_ACCEPT } from '@/components/photos/constants/upload';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import type { UploadConditionPhotosInput } from '@/lib/api/queries/condition-photos';
import { ConditionPhotoFields } from './condition-photo-fields';
import { FilePreview } from './file-preview';
import { conditionPhotoSchema, type ConditionPhotoValues } from './helpers/condition-photo-schema';
import { defaultEvent } from './helpers/default-event';
import { defaultTakenOn } from './helpers/default-taken-on';
import { isWithinLease } from './helpers/is-within-lease';
import type { LeaseDates } from './interfaces/lease-dates.interface';

// Full-size previews of 40 photos are heavy on a phone: show the first ones and a count.
const MAX_PREVIEWS = 12;

interface UploadConditionPhotosFormProps {
  lease?: LeaseDates;
  pending: boolean;
  onSubmit: (input: UploadConditionPhotosInput) => void;
}

// Files + one event/date/note for all of them. No upload state here: the sheet owns the mutation.
export function UploadConditionPhotosForm({
  lease,
  pending,
  onSubmit,
}: UploadConditionPhotosFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [filesError, setFilesError] = useState<string | null>(null);
  const form = useForm<ConditionPhotoValues>({
    resolver: zodResolver(conditionPhotoSchema),
    defaultValues: { event: defaultEvent(lease), takenOn: defaultTakenOn(lease), note: '' },
  });
  const takenOn = useWatch({ control: form.control, name: 'takenOn' });
  const outsideLease = lease !== undefined && takenOn !== '' && !isWithinLease(takenOn, lease);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    // Reset so picking the same files again still fires onChange.
    event.target.value = '';
    if (picked.length === 0) return;
    setFiles(picked);
    setFilesError(null);
  }

  function submit(values: ConditionPhotoValues) {
    if (files.length === 0) return setFilesError('Виберіть фото');
    onSubmit({ files, event: values.event, takenOn: values.takenOn, note: values.note || null });
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        // Files are checked even when the other fields are invalid.
        if (files.length === 0) setFilesError('Виберіть фото');
        void form.handleSubmit(submit)(e);
      }}
    >
      <FieldGroup>
        <Field data-invalid={filesError !== null}>
          <FieldLabel htmlFor="condition-upload-files">Фото</FieldLabel>
          <input
            ref={inputRef}
            id="condition-upload-files"
            type="file"
            multiple
            accept={PHOTO_ACCEPT}
            className="hidden"
            onChange={handleFiles}
          />
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus />
            {files.length === 0 ? 'Вибрати фото' : `Вибрано: ${files.length} · змінити`}
          </Button>
          {files.length > 0 && (
            <ul className="grid grid-cols-4 gap-1.5">
              {files.slice(0, MAX_PREVIEWS).map((file, i) => (
                <li key={`${i}:${file.name}:${file.size}`}>
                  <FilePreview file={file} />
                </li>
              ))}
              {files.length > MAX_PREVIEWS && (
                <li className="flex aspect-square items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                  ще {files.length - MAX_PREVIEWS}
                </li>
              )}
            </ul>
          )}
          {filesError && <FieldError>{filesError}</FieldError>}
        </Field>
        <ConditionPhotoFields control={form.control} idPrefix="condition-upload" />
        {outsideLease && (
          <FieldDescription role="status">
            Дата поза договором — фото буде видно лише на вкладці «Стан» квартири.
          </FieldDescription>
        )}
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? 'Завантаження…' : 'Завантажити'}
        </Button>
      </FieldGroup>
    </form>
  );
}
